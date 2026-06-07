#!/usr/bin/env python3
"""
pre-push-backup.py
Fetches the live state from the Render server and saves a timestamped
JSON snapshot to backups/ before every git push.

Called automatically by .git/hooks/pre-push (installed via scripts/install-hooks.py).
"""
import urllib.request
import json
import os
import sys
import datetime

LIVE_URL   = 'https://world-cup-pool.onrender.com/api/state'
BACKUP_DIR = os.path.join(os.path.dirname(__file__), '..', 'backups')

def main():
    print('[pre-push] Snapshotting live picks before deploy…', flush=True)
    try:
        with urllib.request.urlopen(LIVE_URL, timeout=20) as r:
            data = json.loads(r.read())
    except Exception as e:
        print(f'[pre-push] WARNING: could not fetch live state ({e}). Push proceeding anyway.', flush=True)
        return 0   # don't block the push

    picks     = data.get('picks', {})
    all_picks = sum(
        len(round_picks)
        for p in picks.values()
        for round_picks in p.values()
    )
    if all_picks == 0:
        print('[pre-push] No picks to back up — skipping snapshot.', flush=True)
        return 0

    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts       = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H-%M-%SZ')
    filename = os.path.join(BACKUP_DIR, f'pre-deploy-{ts}.json')
    snapshot = {
        'savedAt':     datetime.datetime.utcnow().isoformat() + 'Z',
        'type':        'pre-deploy',
        'totalPicks':  all_picks,
        'playerCount': len(picks),
        'picks':       picks,
        'bonusPicks':  data.get('bonusPicks', {}),
        'results':     data.get('results', {}),
        'players':     data.get('players', []),
    }
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(snapshot, f, indent=2)

    print(f'[pre-push] Snapshot saved: backups/{os.path.basename(filename)}', flush=True)
    print(f'[pre-push] {all_picks} picks across {len(picks)} players backed up.', flush=True)

    # Prune: keep only the 30 most recent pre-deploy backups
    pre_deploy = sorted(
        [x for x in os.listdir(BACKUP_DIR) if x.startswith('pre-deploy-')]
    )
    while len(pre_deploy) > 30:
        os.remove(os.path.join(BACKUP_DIR, pre_deploy.pop(0)))

    return 0

if __name__ == '__main__':
    sys.exit(main())

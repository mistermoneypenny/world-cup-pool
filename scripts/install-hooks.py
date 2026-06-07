#!/usr/bin/env python3
"""
install-hooks.py
Run once from the repo root to install the pre-push backup hook into .git/hooks/.

  python scripts/install-hooks.py
"""
import os, stat, sys

REPO_ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOOKS_DIR  = os.path.join(REPO_ROOT, '.git', 'hooks')
HOOK_FILE  = os.path.join(HOOKS_DIR, 'pre-push')
SCRIPT_REL = '../../scripts/pre-push-backup.py'   # relative from .git/hooks/

HOOK_CONTENT = f"""#!/bin/sh
# Auto-installed by scripts/install-hooks.py
python "{SCRIPT_REL}" "$@"
"""

# On Windows, git-bash resolves paths relative to the hook file, so use absolute path
ABS_SCRIPT = os.path.join(REPO_ROOT, 'scripts', 'pre-push-backup.py').replace('\\', '/')
HOOK_CONTENT_WIN = f"""#!/bin/sh
# Auto-installed by scripts/install-hooks.py
python "{ABS_SCRIPT}" "$@"
"""

def main():
    if not os.path.isdir(HOOKS_DIR):
        print(f'ERROR: .git/hooks not found at {HOOKS_DIR}')
        sys.exit(1)

    content = HOOK_CONTENT_WIN if sys.platform == 'win32' else HOOK_CONTENT
    with open(HOOK_FILE, 'w', newline='\n') as f:
        f.write(content)

    # Make executable (matters on Unix/macOS)
    current = os.stat(HOOK_FILE).st_mode
    os.chmod(HOOK_FILE, current | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    print(f'Hook installed: {HOOK_FILE}')
    print('Every `git push` will now snapshot picks to backups/ first.')

if __name__ == '__main__':
    main()

exports.handler = async (event) => {
    const apiKey = event.queryStringParameters?.key;
    if (!apiKey) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No API key provided' }) };
    }

    // Build date range: first of current month → today
    const now   = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const end   = now.toISOString().slice(0, 10);

    try {
        const res  = await fetch(
            `https://api.anthropic.com/v1/usage?start_date=${start}&end_date=${end}&limit=100`,
            {
                headers: {
                    'x-api-key':         apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type':      'application/json',
                },
            }
        );
        const data = await res.json();
        return {
            statusCode: res.status,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(data),
        };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};

exports.handler = async () => {
    const symbols = ['TSLA', 'PLTR', '%5EGSPC', 'BZ%3DF', 'CPER', 'EIS', 'GLD', 'KWEB', 'VOO', 'VWO'];
    try {
        const results = await Promise.all(symbols.map(async sym => {
            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`;
            const res  = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const data = await res.json();
            const meta = data.chart.result[0].meta;
            return {
                symbol: meta.symbol,
                price:  meta.regularMarketPrice,
                prev:   meta.chartPreviousClose,
            };
        }));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(results),
        };
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: e.message }),
        };
    }
};

/**
 * MI-AS Wealth - Zero-Dependency Local Auto-Save Server
 * Runs using standard Node.js libraries (no npm install required).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'portfolio_data.json');
const JS_DATA_FILE = path.join(__dirname, 'portfolio_data.js');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // CORS headers for local access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Auto-Save API Endpoint
    if (req.url === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                const prettyJson = JSON.stringify(parsed, null, 2);

                // Write to portfolio_data.json
                fs.writeFileSync(DATA_FILE, prettyJson, 'utf8');

                // Also keep portfolio_data.js in sync
                const jsContent = `/**\n * MI-AS Wealth - Local Portfolio Data File\n * Auto-saved: ${new Date().toISOString()}\n */\n\nconst PORTFOLIO_DATA = ${prettyJson};\n\nif (typeof window !== 'undefined') {\n  window.PORTFOLIO_DATA = PORTFOLIO_DATA;\n}\n`;
                fs.writeFileSync(JS_DATA_FILE, jsContent, 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, timestamp: new Date().toISOString() }));
                console.log(`[${new Date().toLocaleTimeString()}] Portfolio auto-saved to portfolio_data.json`);
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Read Data API Endpoint
    if (req.url === '/api/data' && req.method === 'GET') {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Data file not found' }));
        }
        return;
    }

    // Static File Serving
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(__dirname, reqPath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  MI-AS Wealth Server running at: http://localhost:${PORT}`);
    console.log(`  Any edits in the dashboard will auto-save directly`);
    console.log(`  to portfolio_data.json and portfolio_data.js`);
    console.log(`======================================================\n`);
});

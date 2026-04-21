const express = require('express');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = redis.createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

(async () => {
    await redisClient.connect();
})();

app.get('/', async (req, res) => {
    try {
        const visits = await redisClient.incr('visits');
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MyApp</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
                    h1 { color: #333; }
                    .counter { font-size: 48px; color: #0066cc; margin: 20px; }
                    .info { color: #666; margin-top: 30px; }
                </style>
            </head>
            <body>
                <h1>Hello World from Docker!</h1>
                <p>This page has been visited</p>
                <div class="counter">${visits} times</div>
                <p class="info">Served by: ${req.socket.localAddress} | Redis: connected</p>
            </body>
            </html>
        `);
    } catch (error) {
        res.send(`Error: ${error.message}`);
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

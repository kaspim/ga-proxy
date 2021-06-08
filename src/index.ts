import express from 'express';
import http from 'http';
import AnalyticsProxy from './analytics';
import config from './config';

const app: express.Application = express();
const server: http.Server = http.createServer(app);

app.set('trust proxy', true);

app.get('/analytics.js', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const script: string | null = await new AnalyticsProxy().script();
    const response: { [key: string]: any } = {
        code: !!script ? 200 : 404,
        type: !!script ? 'text/javascript' : 'text/plain',
        body: !!script ? script : '',
    };
    res.status(response.code).setHeader('Content-Type', response.type).send(response.body);
});

app.get('/collect', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const response: number = await new AnalyticsProxy().hit(req);
    res.status(response).send('')
});

server.on('error', (message) => {
    console.log(message);
});

server.listen(config.PROXY_PORT || 80, () => {
    console.log('Server listening on port ' + String(config.PROXY_PORT || 80));
});
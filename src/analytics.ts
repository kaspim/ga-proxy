import express from 'express';
import * as request from 'request-promise-native';
import url from 'url';
import querystring from 'querystring';
import config from './config';

class AnalyticsProxy {
    private readonly analyticsHitUrl: string;
    private readonly analyticsScriptUrl: string;
    private readonly replaceMatch: string;
    private readonly replaceValue: string;
    private readonly publicIpAddress: string | null;

    constructor() {
        this.analyticsHitUrl = 'https://www.google-analytics.com/collect';
        this.analyticsScriptUrl = 'https://www.google-analytics.com/analytics.js';
        this.replaceMatch = 'www.google-analytics.com';
        this.replaceValue = config.PROXY_HOST || this.replaceMatch;
        this.publicIpAddress = config.PROXY_DEFAULT_IP;
    }

    public async script(): Promise<string | null> {
        const source: string | null = await this.download();
        return source !== null ? source.split(this.replaceMatch).join(this.replaceValue) : null;
    }

    public hit(req: express.Request): Promise<number> {
        const uri: url.UrlWithParsedQuery = url.parse(req.url, true);
        const query: querystring.ParsedUrlQuery = uri.query;
        const ip: string | null = req.get('x-forwarded-for') || req.socket?.remoteAddress || null;
        const options: { [key: string]: object } = {
            headers: {
                'user-agent': req.get('user-agent') || null,
                'accept-language': req.get('accept-language') || null,
            }
        };

        if (ip !== null) query['uip'] = this.address(ip);

        return request.get(this.analyticsHitUrl + '?' + querystring.encode(query), options, (error, response) => {
            return !error ? Number(response.statusCode) : 500;
        });
    }

    private download(): Promise<string | null> {
        return request.get(this.analyticsScriptUrl, (error, response) => {
            return !error && response.statusCode === 200 ? response.body : null;
        });
    }

    private address(ip: string): string {
        const ipv4: RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const internal: string[][] = [
            ['10.0.0.0', '10.255.255.255'],
            ['172.16.0.0', '172.31.255.255'],
            ['192.168.0.0', '192.168.255.255'],
            ['169.254.0.0', '169.254.255.255'],
            ['127.0.0.0', '127.255.255.255'],
        ];

        if (ipv4.test(ip)) {
            let ip2int: number | null = AnalyticsProxy.ipv4int(ip);
            internal.forEach(range => {
                let min2int: number | null = AnalyticsProxy.ipv4int(range[0]);
                let max2int: number | null = AnalyticsProxy.ipv4int(range[1]);
                if ((ip2int !== null && min2int !== null && max2int !== null) && (ip2int >= min2int && ip2int <= max2int)) return this.publicIpAddress || ip || '';
            });
        }

        return ip;
    }

    private static ipv4int(ip: string) {
        try {
            let int = Number(ip.split('.').map(d => ("000" + d).substr(-3)).join(''));
            return !isNaN(int) ? int : null;
        } catch (error) {
            return null;
        }
    }
}

export default AnalyticsProxy;
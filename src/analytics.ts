import express from 'express';
import axios from 'axios';
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

    public async script(): Promise<{ code: number, type: string, data: string | null }> {
        const response = await AnalyticsProxy.getRequest(this.analyticsScriptUrl, null);
        return {
            code: response.status || 500,
            type: response.headers['content-type'] || 'text/plain',
            data: response.data?.split(this.replaceMatch).join(this.replaceValue) || null,
        }
    }

    public async hit(req: express.Request): Promise<{ code: number, type: string, data: string | null }> {
        const uri: url.UrlWithParsedQuery = url.parse(req.url, true);
        const query: querystring.ParsedUrlQuery = uri.query;
        const ip: string | null = req.get('x-forwarded-for') || req.socket?.remoteAddress || null;
        const config: { [key: string]: object } = {
            headers: {
                'user-agent': req.get('user-agent') || null,
                'accept-language': req.get('accept-language') || null,
            }
        };

        if (ip !== null) query['uip'] = AnalyticsProxy.address(ip, this.publicIpAddress);

        const response = await AnalyticsProxy.getRequest(this.analyticsHitUrl + '?' + querystring.encode(query), config);
        return {
            code: response.status || 500,
            type: response.headers['content-type'] || 'text/plain',
            data: response.data || null,
        }
    }

    private static async getRequest(url: string, config: object | null): Promise<any | null> {
        return await axios.get(url, config || {}).then(response => {
            return response;
        }).catch(error => {
            return null;
        });
    }

    private static address(ip: string, wan: string | null): string {
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
                if ((ip2int !== null && min2int !== null && max2int !== null) && (ip2int >= min2int && ip2int <= max2int)) return wan || ip || '';
            });
        }

        return ip;
    }

    private static ipv4int(ip: string) {
        let int = Number(ip.split('.').map(d => ('000' + d).substr(-3)).join(''));
        return !isNaN(int) ? int : null;
    }
}

export default AnalyticsProxy;
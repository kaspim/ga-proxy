import dotenv from 'dotenv';

const env: dotenv.DotenvConfigOutput = dotenv.config();
const parsed: dotenv.DotenvParseOutput | undefined = env.parsed;
const config: { [key: string]: any } = {};

if (!!parsed) {
    Object.keys(parsed).forEach(key => {
        if (typeof parsed[key] === 'string' && parsed[key] === 'true') {
            config[key] = true;
        } else if (typeof parsed[key] === 'string' && parsed[key] === 'false') {
            config[key] = false;
        } else if (typeof parsed[key] === 'string' && (parsed[key] === 'null' || parsed[key].length === 0)) {
            config[key] = null;
        } else if (typeof parsed[key] === 'string' && !isNaN(Number(parsed[key]))) {
            config[key] = Number(parsed[key]);
        } else {
            config[key] = parsed[key];
        }
    });
}

export default config;
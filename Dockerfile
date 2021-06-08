FROM node:current-alpine3.13

RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.13/community" >> /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/v3.13/main" >> /etc/apk/repositories \
    && apk update

COPY . /opt/ga-proxy
WORKDIR /opt/ga-proxy

RUN npm install

CMD ["npm", "run", 'prod']
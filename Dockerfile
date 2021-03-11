FROM node:14-alpine

RUN apk add --no-cache --virtual .persistent-deps \
        curl \
        openssl \
        make \
        gcc \
        g++ \
        python \
        py-pip \
    && npm install --silent --save-dev -g \
        typescript

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

RUN tsc -p .

ENTRYPOINT [ "node", "./build/scan.js" ]
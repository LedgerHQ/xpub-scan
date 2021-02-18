FROM node:14-alpine

RUN apk update

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

ENTRYPOINT [ "node", "./build/scan.js" ]
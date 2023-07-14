FROM node:16-alpine

ENV PYTHONUNBUFFERED=1
ENV TERM xterm-256color

# install python make and g++ (required by tiny-secp256)
RUN apk add --update --no-cache python3 make g++ && ln -sf python3 /usr/bin/python

WORKDIR /app

COPY package.json npm-shrinkwrap.json ./

RUN npm i && npm run ci

COPY . .

RUN npm run build

ENTRYPOINT [ "node", "./lib/scan.js" ]

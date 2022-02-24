FROM node:17-alpine

ENV PYTHONUNBUFFERED=1

# install python make and g++ (required by tiny-secp256)
RUN apk add --update --no-cache python3 make g++ && ln -sf python3 /usr/bin/python

WORKDIR /app

COPY npm-shrinkwrap.json ./

RUN npm ci

COPY . .

RUN npm run build

ENV TERM xterm-256color

ENTRYPOINT [ "node", "./lib/scan.js" ]

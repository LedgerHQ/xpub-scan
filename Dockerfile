FROM node:14-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build
ENV TERM xterm-256color
ENTRYPOINT [ "node", "./lib/scan.js" ]

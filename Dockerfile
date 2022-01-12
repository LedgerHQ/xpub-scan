FROM node:14-alpine
WORKDIR /app
COPY package.json npm-shrinkwrap.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV TERM xterm-256color
ENTRYPOINT [ "node", "./lib/scan.js" ]

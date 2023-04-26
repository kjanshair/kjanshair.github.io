FROM node:carbon

RUN mkdir -p /app

COPY package.json /app

WORKDIR /app

RUN npm install -g gulp@^3.9.1 && npm install
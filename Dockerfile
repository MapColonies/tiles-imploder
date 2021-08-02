FROM node:12 as build


WORKDIR /tmp/buildApp

COPY ./package*.json ./

RUN npm install
COPY . .
RUN npm run build

FROM osgeo/gdal:ubuntu-small-3.3.0

RUN apt-get update
RUN apt-get install -y sqlite3 libsqlite3-dev
RUN apt-get install -y nodejs npm
RUN apt-get install -y dumb-init

RUN useradd -U node -s /bin/bash

ENV NODE_ENV=production
ENV SERVER_PORT=8080


WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=build /tmp/buildApp/dist .
COPY  ./config ./config


USER node
EXPOSE 8080
CMD ["dumb-init", "node", "--max_old_space_size=512", "./index.js"]

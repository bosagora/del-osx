FROM node:18-alpine

RUN apk add --update python3 g++ make yarn
RUN alias python=python3

WORKDIR /app/

ADD . /app/
COPY ./env/.env.sample /app/env/.env

RUN yarn install

ENTRYPOINT [ "/app/docker/entrypoint.sh" ]

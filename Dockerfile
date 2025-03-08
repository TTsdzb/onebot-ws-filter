FROM node:slim
WORKDIR /app

COPY ./dist/onebot-ws-filter.js ./

CMD node ./onebot-ws-filter.js ./config/config.yml

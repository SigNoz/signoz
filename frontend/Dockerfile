FROM node:12.20.1-alpine3.9


ADD ./ ./frontend

WORKDIR /frontend

RUN yarn && yarn build
RUN yarn global add serve

ARG PORT=3000

EXPOSE $PORT

CMD ["serve", "-s","build"]
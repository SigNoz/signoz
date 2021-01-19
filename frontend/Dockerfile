# stage1 as builder
FROM node:14-alpine as builder

WORKDIR /frontend

# copy the package.json to install dependencies
COPY package.json ./

# Install the dependencies and make the folder
RUN yarn install 

COPY . .

# Build the project and copy the files
RUN yarn build

FROM nginx:1.15-alpine

#!/bin/sh

COPY conf/default.conf /etc/nginx/conf.d/default.conf

## Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy from the stahg 1
COPY --from=builder /frontend/build /usr/share/nginx/html

EXPOSE 3000

ENTRYPOINT ["nginx", "-g", "daemon off;"]
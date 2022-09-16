# Builder stage
FROM node:16.15.0-slim as builder

# Add Maintainer Info
LABEL maintainer="signoz"

ARG TARGETOS=linux
ARG TARGETARCH

WORKDIR /frontend

# Copy the package.json to install dependencies
COPY package.json ./

# Install the dependencies and make the folder
RUN CI=1 yarn install

COPY . .

# Build the project and copy the files
RUN yarn build


FROM nginx:1.18-alpine

COPY conf/default.conf /etc/nginx/conf.d/default.conf

# Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy from the stahg 1
COPY --from=builder /frontend/build /usr/share/nginx/html

EXPOSE 3301

ENTRYPOINT ["nginx", "-g", "daemon off;"]

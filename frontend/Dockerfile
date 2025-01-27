FROM nginx:1.26-alpine

# Add Maintainer Info
LABEL maintainer="signoz"

# Set working directory
WORKDIR /frontend

# Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx config and static files
COPY conf/default.conf /etc/nginx/conf.d/default.conf
COPY build /usr/share/nginx/html

EXPOSE 3301

ENTRYPOINT ["nginx", "-g", "daemon off;"]

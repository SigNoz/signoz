# use a minimal alpine image
FROM alpine:3.20.3

# Add Maintainer Info
LABEL maintainer="signoz"

ARG OS="linux"
ARG ARCH

# add ca-certificates in case you need them
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

# set working directory
WORKDIR /root

# copy the signoz binary
COPY ./target/${OS}-${ARCH}/signoz /root/signoz

# copy prometheus YAML config
COPY pkg/query-service/config/prometheus.yml /root/config/prometheus.yml
COPY pkg/query-service/templates /root/templates

# Make signoz executable for non-root users
RUN chmod 755 /root /root/signoz

# Copy frontend
COPY frontend/build/ /etc/signoz/web/

# run the binary
ENTRYPOINT ["./signoz"]

CMD ["-config", "/root/config/prometheus.yml"]

EXPOSE 8080

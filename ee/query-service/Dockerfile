# use a minimal alpine image
FROM alpine:3.20.3

# Add Maintainer Info
LABEL maintainer="signoz"

# define arguments that can be passed during build time
ARG TARGETOS TARGETARCH

# add ca-certificates in case you need them
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

# set working directory
WORKDIR /root

# copy the query-service binary
COPY ee/query-service/bin/query-service-${TARGETOS}-${TARGETARCH} /root/query-service

# copy prometheus YAML config
COPY pkg/query-service/config/prometheus.yml /root/config/prometheus.yml
COPY pkg/query-service/templates /root/templates

# Make query-service executable for non-root users
RUN chmod 755 /root /root/query-service

# Copy frontend
COPY frontend/build/ /etc/signoz/web/

# run the binary
ENTRYPOINT ["./query-service"]

CMD ["-config", "/root/config/prometheus.yml"]

EXPOSE 8080

FROM alpine:3.16 as builder


RUN apk add --no-cache ca-certificates openssl
RUN wget https://github.com/buger/goreplay/releases/download/1.3.3/gor_1.3.3_x64.tar.gz -O gor.tar.gz
RUN tar xzf gor.tar.gz


# use a minimal alpine image
FROM ubuntu:latest

# Add Maintainer Info
LABEL maintainer="signoz"

# define arguments that can be passed during build time
ARG TARGETOS TARGETARCH

# add ca-certificates in case you need them
# RUN apt update && apt add ca-certificates && rm -rf /var/cache/apk/*

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /gor /root/gor

# set working directory
WORKDIR /root

# copy the query-service binary
COPY ee/query-service/bin/query-service-${TARGETOS}-${TARGETARCH} /root/query-service
COPY ee/query-service/start.sh /root/start.sh

# copy prometheus YAML config
COPY pkg/query-service/config/prometheus.yml /root/config/prometheus.yml
COPY pkg/query-service/templates /root/templates

# Make query-service executable for non-root users
RUN chmod 755 /root /root/query-service /root/start.sh /root/gor

# run the binary
ENTRYPOINT ["/bin/bash", "./start.sh"]

# ENTRYPOINT ["./query-service"]

# CMD ["-config", "/root/config/prometheus.yml"]

# CMD ["-config", "/root/config/prometheus.yml"]

EXPOSE 8080

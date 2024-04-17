FROM alpine:3.16 as builder


RUN apk add --no-cache ca-certificates openssl
RUN wget https://github.com/buger/goreplay/releases/download/1.3.3/gor_1.3.3_x64.tar.gz -O gor.tar.gz
RUN tar xzf gor.tar.gz


# use a minimal alpine image
FROM alpine:3.18.6

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
COPY ee/query-service/start.sh /root/start.sh

# copy prometheus YAML config
COPY pkg/query-service/config/prometheus.yml /root/config/prometheus.yml
COPY pkg/query-service/templates /root/templates

# Make query-service executable for non-root users
RUN chmod 755 /root /root/query-service /root/start.sh

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /gor .

# run the binary
ENTRYPOINT ["/root/start.sh"]

# CMD ["-config", "/root/config/prometheus.yml"]

EXPOSE 8080

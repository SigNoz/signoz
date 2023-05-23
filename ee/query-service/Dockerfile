FROM golang:1.18-buster AS builder

# LD_FLAGS is passed as argument from Makefile. It will be empty, if no argument passed
ARG LD_FLAGS
ARG TARGETPLATFORM

ENV CGO_ENABLED=1
ENV GOPATH=/go

RUN export GOOS=$(echo ${TARGETPLATFORM} | cut -d / -f1) && \
    export GOARCH=$(echo ${TARGETPLATFORM} | cut -d / -f2)

# Prepare and enter src directory
WORKDIR /go/src/github.com/signoz/signoz

# Add the sources and proceed with build
ADD . .
RUN cd ee/query-service \
    && go build -tags timetzdata -a -o ./bin/query-service \
    -ldflags "-linkmode external -extldflags '-static' -s -w $LD_FLAGS" \
    && chmod +x ./bin/query-service


# use a minimal alpine image
FROM alpine:3.7

# Add Maintainer Info
LABEL maintainer="signoz"

# add ca-certificates in case you need them
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

# set working directory
WORKDIR /root

# copy the binary from builder
COPY --from=builder /go/src/github.com/signoz/signoz/ee/query-service/bin/query-service .

# copy prometheus YAML config
COPY pkg/query-service/config/prometheus.yml /root/config/prometheus.yml

# run the binary
ENTRYPOINT ["./query-service"]

CMD ["-config", "../config/prometheus.yml"]
# CMD ["./query-service -config /root/config/prometheus.yml"]

EXPOSE 8080

FROM golang:1.17-buster AS builder

# LD_FLAGS is passed as argument from Makefile. It will be empty, if no argument passed
ARG LD_FLAGS
ARG TARGETPLATFORM

ENV CGO_ENABLED=1
ENV GOPATH=/go

RUN export GOOS=$(echo ${TARGETPLATFORM} | cut -d / -f1) && \
    export GOARCH=$(echo ${TARGETPLATFORM} | cut -d / -f2)

# Prepare and enter src directory
WORKDIR /go/src/github.com/signoz/signoz/pkg/query-service

# Cache dependencies
ADD go.mod .
ADD go.sum .
RUN go mod download -x

# Add the sources and proceed with build
ADD . .

RUN go mod tidy
WORKDIR /go/src/github.com/signoz/signoz/pkg/query-service/ee

RUN go build -tags timetzdata -a -ldflags "-linkmode external -extldflags '-static' -s -w $LD_FLAGS" -o query-service main.go
RUN chmod +x query-service

# use a minimal alpine image
# FROM alpine:3.7

# Add Maintainer Info
# LABEL maintainer="signoz"

# add ca-certificates in case you need them
# RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

# set working directory
# WORKDIR /root

# copy the binary from builder
# COPY --from=builder /go/src/github.com/signoz/signoz/pkg/query-service/ee/query-service .

# COPY config/prometheus.yml /root/config/prometheus.yml

# run the binary
ENTRYPOINT ["./query-service"]

CMD ["-config", "../config/prometheus.yml"]
# CMD ["./query-service -config /root/config/prometheus.yml"]

EXPOSE 8080
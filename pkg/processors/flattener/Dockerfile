FROM golang:1.14-buster AS builder
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64
ENV GOPATH=/go

# Prepare and enter src directory
WORKDIR /go/src/github.com/signoz/signoz/pkg/processors/flattener

# Cache dependencies
ADD go.mod .
ADD go.sum .
RUN go mod download -x

# Add the sources and proceed with build
ADD . .
RUN go build -o ./bin/flattener ./main.go
RUN chmod +x ./bin/flattener

# use a minimal alpine image
FROM alpine:3.7
# add ca-certificates in case you need them
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*
# set working directory
WORKDIR /root
# copy the binary from builder
COPY --from=builder /go/src/github.com/signoz/signoz/pkg/processors/flattener/bin/flattener .
# run the binary
CMD ["./flattener"]
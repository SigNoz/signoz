FROM node:16-alpine as builder 
WORKDIR /app

RUN apk update && apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    vips-dev \
    git > /dev/null 2>&1
ENV PATH /app/node_modules/.bin:$PATH

COPY frontend/package.json frontend/yarn.lock ./

RUN CI=1 yarn install

COPY frontend/ ./

RUN CI=1 yarn build

# -----------------------------------------------------------------------------

FROM golang:1.21-bullseye
WORKDIR $GOPATH/src/go.signoz.io/signoz

RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends \
		g++ \
		gcc \
		libc6-dev \
		make \
		pkg-config \
	; \
	rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum .

RUN go mod download

COPY . .

RUN CGO_ENABLED=1 go build -race -o /usr/local/bin/signoz ./cmd/signoz/
COPY --from=builder /app/build/ /etc/signoz/web/

COPY pkg/query-service/config/prometheus.yml /etc/signoz/config/prometheus.yml
COPY pkg/query-service/templates /etc/signoz/templates

CMD [ "/usr/local/bin/signoz" ]
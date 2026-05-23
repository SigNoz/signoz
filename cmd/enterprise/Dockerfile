FROM alpine:3.20.3
LABEL maintainer="signoz"

ARG OS="linux"
ARG TARGETARCH

RUN apk update && \
	apk add ca-certificates && \
	rm -rf /var/cache/apk/*

# Security: create non-root user and writable data directory
RUN addgroup --system --gid 1001 signoz && adduser --system --uid 1001 --ingroup signoz signoz
RUN mkdir -p /var/lib/signoz && chown signoz:signoz /var/lib/signoz

# Copy application files (still as root for correct permissions)
COPY ./target/${OS}-${TARGETARCH}/signoz /var/lib/signoz/signoz
COPY ./templates/email /var/lib/signoz/templates
COPY frontend/build/ /etc/signoz/web/

RUN chmod 755 /var/lib/signoz/signoz

# Switch to non-root user and writable working directory
WORKDIR /var/lib/signoz
USER signoz

ENTRYPOINT ["./signoz", "server"]

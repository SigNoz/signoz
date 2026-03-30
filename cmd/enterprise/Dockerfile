FROM alpine:3.20.3
LABEL maintainer="signoz"
WORKDIR /root

ARG OS="linux"
ARG TARGETARCH

RUN apk update && \
	apk add ca-certificates && \
	rm -rf /var/cache/apk/*


COPY ./target/${OS}-${TARGETARCH}/signoz /root/signoz
COPY ./templates/email /root/templates
COPY frontend/build/ /etc/signoz/web/

RUN chmod 755 /root /root/signoz

# Security: run as non-root user
RUN addgroup --system --gid 1001 signoz && adduser --system --uid 1001 --ingroup signoz signoz

# Create data directory with correct ownership for SQLite database
RUN mkdir -p /var/lib/signoz && chown signoz:signoz /var/lib/signoz

USER signoz

ENTRYPOINT ["./signoz", "server"]

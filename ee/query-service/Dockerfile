FROM alpine:3.20.3
LABEL maintainer="signoz"
WORKDIR /root

ARG OS="linux"
ARG ARCH

RUN apk update && \
	apk add ca-certificates && \
	rm -rf /var/cache/apk/*


COPY ./target/${OS}-${ARCH}/signoz /root/signoz
COPY pkg/query-service/config/prometheus.yml /root/config/prometheus.yml
COPY pkg/query-service/templates /root/templates
COPY frontend/build/ /etc/signoz/web/

RUN chmod 755 /root /root/signoz

ENTRYPOINT ["./signoz"]
CMD ["-config", "/root/config/prometheus.yml"]

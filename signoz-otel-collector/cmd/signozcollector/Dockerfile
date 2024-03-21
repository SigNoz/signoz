# use a minimal alpine image
FROM alpine:3

# add ca-certificates in case you need them
#RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

# define arguments and default values
ARG TARGETOS TARGETARCH
ARG USER_UID=10001

# create a non-root user for running the collector
USER ${USER_UID}

# copy the binaries from the multi-stage build
COPY .build/${TARGETOS}-${TARGETARCH}/signoz-collector /signoz-collector

# copy the config file
COPY config/default-config.yaml /etc/otel/config.yaml

# expose OTLP ports for the collector
EXPOSE 4317 4318

# run the binary as the entrypoint and pass the default config file as a flag
ENTRYPOINT [ "/signoz-collector" ]
CMD ["--config", "/etc/otel/config.yaml"]

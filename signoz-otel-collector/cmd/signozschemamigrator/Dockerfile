# use a minimal alpine image
FROM alpine:3.17

# define arguments and default values
ARG TARGETOS TARGETARCH
ARG USER_UID=10001

# create a non-root user for running the migrator
USER ${USER_UID}

# copy the binaries from the multi-stage build
COPY .build/${TARGETOS}-${TARGETARCH}/signoz-schema-migrator /signoz-schema-migrator
COPY migrationmanager ./migrationmanager

# run the binary as the entrypoint and pass the default dsn as a flag
ENTRYPOINT [ "/signoz-schema-migrator" ]
CMD ["--dsn", "tcp://localhost:9000"]

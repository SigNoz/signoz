#!/bin/sh

# It Comments out the Line Query-Service & Frontend Section of deploy/docker/clickhouse-setup/docker-compose.yaml
# Update the Line Numbers when deploy/docker/clickhouse-setup/docker-compose.yaml chnages.
# Docs Ref.: https://github.com/SigNoz/signoz/blob/main/CONTRIBUTING.md#contribute-to-frontend-with-docker-installation-of-signoz

sed -i 38,62's/.*/# &/' .././deploy/docker/clickhouse-setup/docker-compose.yaml

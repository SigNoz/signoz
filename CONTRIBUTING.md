# How to Contribute

There are primarily 3 areas in which you can contribute in SigNoz

- Frontend ( written in Typescript, React)
- Query Service (written in Go)
- Flattener Processor (written in Go)

Depending upon your area of expertise & interest, you can chose one or more to contribute. Below are detailed instructions to contribute in each area

# Develop Frontend

Need to update [https://github.com/SigNoz/signoz/tree/main/frontend](https://github.com/SigNoz/signoz/tree/main/frontend)

### Contribute to Frontend with Docker installation of SigNoz

- `git clone [https://github.com/SigNoz/signoz.git](https://github.com/SigNoz/signoz.git) && cd signoz`
- comment out frontend service section at `deploy/docker/clickhouse-setup/docker-compose.yaml#L38`
- run `cd deploy && docker-compose -f docker/clickhouse-setup/docker-compose.yaml up -d` (this will install signoz locally without the frontend service)
- `cd ../frontend` and change baseURL to `http://localhost:8080` in file `src/constants/env.ts`
- `yarn install`
- `yarn dev`

### Contribute to Frontend without installing SigNoz backend

If you don't want to install SigNoz backend just for doing frontend development, we can provide you with test environments which you can use as the backend. Please ping us in #contributing channel in our [slack community](https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA) and we will DM you with `<test environment URL>`

- `git clone [https://github.com/SigNoz/signoz.git](https://github.com/SigNoz/signoz.git) && cd signoz/frontend`
- change baseURL to `<test environment URL>` in file `src/constants/env.ts`
- `yarn install`
- `yarn dev`

**_Frontend should now be accessible at `http://localhost:3000/application`_**

# Contribute to Query-Service

Need to update [https://github.com/SigNoz/signoz/tree/main/pkg/query-service](https://github.com/SigNoz/signoz/tree/main/pkg/query-service)

### To run ClickHouse setup (recommended for local development)

- `git clone [https://github.com/SigNoz/signoz.git](https://github.com/SigNoz/signoz.git) && cd signoz/deploy`
- comment out frontend service section at `docker/clickhouse-setup/docker-compose.yaml#L38`
- comment out query-service section at `docker/clickhouse-setup/docker-compose.yaml#L22`
- Run `docker-compose -f docker/clickhouse-setup/docker-compose.yaml up -d` (this will install signoz locally without the frontend and query-service)
- `STORAGE=clickhouse ClickHouseUrl=tcp://localhost:9001 go run main.go`

**_Query Service should now be available at `http://localhost:8080`_**

> If you want to see how, frontend plays with query service, you can run frontend also in you local env with the baseURL changed to [`http://localhost:8080`](http://ec2-18-191-251-86.us-east-2.compute.amazonaws.com:8080/) in file `src/constants/env.ts` as the query-service is now running at port `8080`

# Contribute to Flattener Processor

Not needed to run for the ClickHouse setup

more info at [https://github.com/SigNoz/signoz/tree/main/pkg/processors/flattener](https://github.com/SigNoz/signoz/tree/main/pkg/processors/flattener)

## General Instructions

You can always reach out to `ankit@signoz.io` to understand more about the repo and product. We are very responsive over email and [slack](https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA).

- If you find any bugs, please create an issue
- If you find anything missing in documentation, you can create an issue with label **documentation**
- If you want to build any new feature, please create an issue with label `enhancement`
- If you want to discuss something about the product, start a new [discussion](https://github.com/SigNoz/signoz/discussions)

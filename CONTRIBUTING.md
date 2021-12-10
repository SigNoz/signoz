# How to Contribute

There are primarily 3 areas in which you can contribute in SigNoz

- Frontend ( written in Typescript, React)
- Query Service (written in Go)
- Flattener Processor (written in Go)

Depending upon your area of expertise & interest, you can chose one or more to contribute. Below are detailed instructions to contribute in each area

# Develop Frontend

Need to update [https://github.com/SigNoz/signoz/tree/main/frontend](https://github.com/SigNoz/signoz/tree/main/frontend)

### Contribute to Frontend with Docker installation of SigNoz

- `git clone https://github.com/SigNoz/signoz.git && cd signoz`
- comment out frontend service section at `deploy/docker/clickhouse-setup/docker-compose.yaml#L38`
- run `cd deploy` to move to deploy directory
- Install signoz locally without the frontend
  - If you are using x86_64 processors (All Intel/AMD processors) run `sudo docker-compose --env-file ./docker/clickhouse-setup/env/x86_64.env -f docker/clickhouse-setup/docker-compose.yaml up -d`
  - If you are on arm64 processors (Apple M1 Macbooks) run `sudo docker-compose --env-file ./docker/clickhouse-setup/env/arm64.env -f docker/clickhouse-setup/docker-compose.yaml up -d`
- `cd ../frontend` and change baseURL to `http://localhost:8080` in file `src/constants/env.ts`
- `yarn install`
- `yarn dev`

### Contribute to Frontend without installing SigNoz backend

If you don't want to install SigNoz backend just for doing frontend development, we can provide you with test environments which you can use as the backend. Please ping us in #contributing channel in our [slack community](https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA) and we will DM you with `<test environment URL>`

- `git clone https://github.com/SigNoz/signoz.git && cd signoz/frontend`
- Create a file `.env` with `FRONTEND_API_ENDPOINT=<test environment URL>`
- `yarn install`
- `yarn dev`

**_Frontend should now be accessible at `http://localhost:3000/application`_**

# Contribute to Query-Service

Need to update [https://github.com/SigNoz/signoz/tree/main/pkg/query-service](https://github.com/SigNoz/signoz/tree/main/pkg/query-service)

### To run ClickHouse setup (recommended for local development)

- `git clone https://github.com/SigNoz/signoz.git && cd signoz/deploy`
- comment out frontend service section at `docker/clickhouse-setup/docker-compose.yaml#L38`
- comment out query-service section at `docker/clickhouse-setup/docker-compose.yaml#L22`
- Install signoz locally without the frontend and query-service
  - If you are using x86_64 processors (All Intel/AMD processors) run `sudo docker-compose --env-file ./docker/clickhouse-setup/env/x86_64.env -f docker/clickhouse-setup/docker-compose.yaml up -d`
  - If you are on arm64 processors (Apple M1 Macbooks) run `sudo docker-compose --env-file ./docker/clickhouse-setup/env/arm64.env -f docker/clickhouse-setup/docker-compose.yaml up -d`
- `STORAGE=clickhouse ClickHouseUrl=tcp://localhost:9001 go run main.go`

**_Query Service should now be available at `http://localhost:8080`_**

> If you want to see how, frontend plays with query service, you can run frontend also in you local env with the baseURL changed to `http://localhost:8080` in file `src/constants/env.ts` as the query-service is now running at port `8080`

# Contribute to Flattener Processor

Not needed to run for the ClickHouse setup

more info at [https://github.com/SigNoz/signoz/tree/main/pkg/processors/flattener](https://github.com/SigNoz/signoz/tree/main/pkg/processors/flattener)

## General Instructions

You can always reach out to `ankit@signoz.io` to understand more about the repo and product. We are very responsive over email and [slack](https://join.slack.com/t/signoz-community/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA).

- If you find any bugs, please create an issue
- If you find anything missing in documentation, you can create an issue with label **documentation**
- If you want to build any new feature, please create an issue with label `enhancement`
- If you want to discuss something about the product, start a new [discussion](https://github.com/SigNoz/signoz/discussions)

### Conventions to follow when submitting commits, PRs

1. We try to follow https://www.conventionalcommits.org/en/v1.0.0/

More specifically the commits and PRs should have type specifiers prefixed in the name. [This](https://www.conventionalcommits.org/en/v1.0.0/#specification) should give you a better idea.

e.g. If you are submitting a fix for an issue in frontend - PR name should be prefixed with `fix(FE):`

2. Follow [GitHub Flow](https://guides.github.com/introduction/flow/) guidelines for your contribution flows

3. Feel free to ping us on `#contributing` or `#contributing-frontend` on our slack community if you need any help on this :)

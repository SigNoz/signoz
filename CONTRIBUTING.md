# How to Contribute

There are primarily 2 areas in which you can contribute in SigNoz

- Frontend ( written in Typescript, React)
- Backend - ( Query Service - written in Go)

Depending upon your area of expertise & interest, you can chose one or more to contribute. Below are detailed instructions to contribute in each area

> Please note: If you want to work on an issue, please ask the maintainers to assign the issue to you before starting work on it. This would help us understand who is working on an issue and prevent duplicate work. 🙏🏻

> If you just raise a PR, without the corresponding issue being assigned to you - it may not be accepted.

# Develop Frontend

Need to update [https://github.com/SigNoz/signoz/tree/main/frontend](https://github.com/SigNoz/signoz/tree/main/frontend)

### Contribute to Frontend with Docker installation of SigNoz

- `git clone https://github.com/SigNoz/signoz.git && cd signoz`
- comment out frontend service section at `deploy/docker/clickhouse-setup/docker-compose.yaml#L59`
- run `cd deploy` to move to deploy directory
- Install signoz locally without the frontend
    - Add below configuration to query-service section at `docker/clickhouse-setup/docker-compose.yaml#L36`

    ```docker
    ports:
      - "8080:8080"
    ```
  - If you are using x86_64 processors (All Intel/AMD processors) run `sudo docker-compose -f docker/clickhouse-setup/docker-compose.yaml up -d`
  - If you are on arm64 processors (Apple M1 Macbooks) run `sudo docker-compose -f docker/clickhouse-setup/docker-compose.arm.yaml up -d`
- `cd ../frontend` and change baseURL to `http://localhost:8080` in file `src/constants/env.ts`
- `yarn install`
- `yarn dev`

> Notes for Maintainers/Contributors who will change Line Numbers of Frontend & Query-Section. Please Update Line Numbers in `./scripts/commentLinesForSetup.sh`

### Contribute to Frontend without installing SigNoz backend

If you don't want to install SigNoz backend just for doing frontend development, we can provide you with test environments which you can use as the backend. Please ping us in #contributing channel in our [slack community](https://signoz.io/slack) and we will DM you with `<test environment URL>`

- `git clone https://github.com/SigNoz/signoz.git && cd signoz/frontend`
- Create a file `.env` with `FRONTEND_API_ENDPOINT=<test environment URL>`
- `yarn install`
- `yarn dev`

**_Frontend should now be accessible at `http://localhost:3301/application`_**

# Contribute to Query-Service

Need to update [https://github.com/SigNoz/signoz/tree/main/pkg/query-service](https://github.com/SigNoz/signoz/tree/main/pkg/query-service)

### To run ClickHouse setup (recommended for local development)

- git clone https://github.com/SigNoz/signoz.git
- run `cd signoz` to move to signoz directory
- run `sudo make dev-setup` to configure local setup to run query-service
- comment out frontend service section at `docker/clickhouse-setup/docker-compose.yaml#L45`
- comment out query-service section at `docker/clickhouse-setup/docker-compose.yaml#L28`
- add below configuration to clickhouse section at `docker/clickhouse-setup/docker-compose.yaml#L6`
```docker
    expose:
      - 9000
    ports:
      - 9001:9000
```

- run `cd pkg/query-service/` to move to query-service directory
- Open ./constants/constants.go
    - Replace ```const RELATIONAL_DATASOURCE_PATH = "/var/lib/signoz/signoz.db"``` \
        with ```const RELATIONAL_DATASOURCE_PATH = "./signoz.db".```

- Install signoz locally without the frontend and query-service
  - If you are using x86_64 processors (All Intel/AMD processors) run `sudo make run-x86`
  - If you are on arm64 processors (Apple M1 Macbooks) run `sudo make run-arm`

#### Run locally
```console
ClickHouseUrl=tcp://localhost:9001 STORAGE=clickhouse go run main.go
```

> Notes for Maintainers/Contributors who will change Line Numbers of Frontend & Query-Section. Please Update Line Numbers in `./scripts/commentLinesForSetup.sh`

**_Query Service should now be available at `http://localhost:8080`_**

> If you want to see how, frontend plays with query service, you can run frontend also in you local env with the baseURL changed to `http://localhost:8080` in file `src/constants/env.ts` as the query-service is now running at port `8080`

---
<!-- Instead of configuring a local setup, you can also use [Gitpod](https://www.gitpod.io/), a VSCode-based Web IDE.

Click the button below. A workspace with all required environments will be created.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/SigNoz/signoz)

> To use it on your forked repo, edit the 'Open in Gitpod' button url to `https://gitpod.io/#https://github.com/<your-github-username>/signoz` -->

# Contribute to SigNoz Helm Chart

Need to update [https://github.com/SigNoz/charts](https://github.com/SigNoz/charts).

### To run helm chart for local development

- run `git clone https://github.com/SigNoz/charts.git` followed by `cd charts`
- it is recommended to use lightweight kubernetes (k8s) cluster for local development:
  - [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
  - [k3d](https://k3d.io/#installation)
  - [minikube](https://minikube.sigs.k8s.io/docs/start/)
- create a k8s cluster and make sure `kubectl` points to the locally created k8s cluster
- run `helm install -n platform --create-namespace my-release charts/signoz` to install SigNoz chart
- run `kubectl -n platform port-forward svc/my-release-frontend 3301:3301` to make SigNoz UI available at [localhost:3301](http://localhost:3301)

**To load data with HotROD sample app:**

```sh
kubectl create ns sample-application

kubectl -n sample-application apply -f https://raw.githubusercontent.com/SigNoz/signoz/main/sample-apps/hotrod/hotrod.yaml

kubectl -n sample-application run strzal --image=djbingham/curl \
--restart='OnFailure' -i --tty --rm --command -- curl -X POST -F \
'locust_count=6' -F 'hatch_rate=2' http://locust-master:8089/swarm
```

**To stop the load generation:**

```sh
kubectl -n sample-application run strzal --image=djbingham/curl \
 --restart='OnFailure' -i --tty --rm --command -- curl \
 http://locust-master:8089/stop
```
---

## General Instructions

You can always reach out to `ankit@signoz.io` to understand more about the repo and product. We are very responsive over email and [slack](https://signoz.io/slack).

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

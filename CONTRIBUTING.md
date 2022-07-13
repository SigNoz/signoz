# Contributing Guidelines

#### Welcome to SigNoz Contributing section 🎉

Thank you for your interest in contributing to our project. Whether it's a bug report, new feature, correction, or additional documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary information to effectively respond to your bug report or contribution.

## Sections:
- [General Guidelines](#1-general-instructions) 
- [How to Contribute](#2-how-to-contribute)
- [Develop Frontend](#3-develop-frontend)
  - [Contribute to Frontend with Docker installation of SigNoz](#31-contribute-to-frontend-with-docker-installation-of-signoz)
  - [Contribute to Frontend without installing SigNoz backend](#32-contribute-to-frontend-without-installing-signoz-backend)
- [Contribute to Query-Service](#4-contribute-to-query-service)
- [Contribute to SigNoz Helm Chart](#5-contribute-to-signoz-helm-chart)

# 1. General Instructions 📝

Before making any significant changes and before filing an issue, please check [existing open](https://github.com/SigNoz/signoz/issues?q=is%3Aopen+is%3Aissue), or [recently closed](https://github.com/SigNoz/signoz/issues?q=is%3Aissue+is%3Aclosed), issues to make sure somebody else hasn't already reported the issue. Please try to include as much information as you can. 

#### Details like these are incredibly useful:

- **Requirement** - what kind of use case are you trying to solve?
- **Proposal** - what do you suggest to solve the problem or improve the existing
  situation?
- Any open questions to address❓

#### If you are reporting a bug, details like these are incredibly useful:

- A reproducible test case or series of steps.
- The version of our code being used.
- Any modifications you've made relevant to the bug🐞.
- Anything unusual about your environment or deployment.

<hr>

Discussing your proposed changes ahead of time will make the contribution
process smooth for everyone. 

Once the approach is agreed upon✅, make your changes
and open a Pull Request(s). 

**Note:** Unless your change is small, **please** consider submitting different Pull Rrequest(s):

* 1️⃣ First PR should include the overall structure of the new component:
  * Readme, configuration, interfaces or base classes, etc...
  * This PR is usually trivial to review, so the size limit does not apply to
    it.
* 2️⃣ Second PR should include the concrete implementation of the component. If the
  size of this PR is larger than the recommended size, consider splitting it into
  multiple PRs.
* If there are multiple sub-component then ideally each one should be implemented as
  a separate pull request.
* Last PR should include changes to any user-facing documentation. And should include
  end-to-end tests if applicable. The component must be enabled
  only after sufficient testing, and there is enough confidence in the
  stability and quality of the component.


You can always reach out to `ankit@signoz.io` to understand more about the repo and product. We are very responsive over email and [SLACK](https://signoz.io/slack).

- If you find any **bugs** → please create an **issue.**
- If you find anything **missing** in documentation → you can create an issue with the label **`documentation`**.
- If you want to build any **new feature** → please create an issue with the label **`enhancement`**.
- If you want to **discuss** something about the product, start a new [**discussion**.](https://github.com/SigNoz/signoz/discussions)

<hr>

### Conventions to follow when submitting Commits and Pull Request(s).

- We try to follow [Conventional Commits.](https://www.conventionalcommits.org/en/v1.0.0/)
, more specifically the commits and PRs should have type specifiers prefixed in the name. [This](https://www.conventionalcommits.org/en/v1.0.0/#specification) should give you a better idea.

e.g. If you are submitting a fix for an issue in frontend, the PR name should be prefixed with **`fix(FE):`**

- Follow [GitHub Flow](https://guides.github.com/introduction/flow/) guidelines for your contribution flows.

- Feel free to ping us on [#contributing](https://signoz-community.slack.com/archives/C01LWQ8KS7M) or [#contributing-frontend](https://signoz-community.slack.com/archives/C027134DM8B) on our slack community if you need any help on this :)

<hr>

# 2. How to Contribute 🙋🏻‍♂️

#### There are primarily 2 areas in which you can contribute to SigNoz

- **Frontend** (Written in Typescript, React)
- **Backend** (Query Service,  written in Go)

Depending upon your area of expertise & interest, you can choose one or more to contribute. Below are detailed instructions to contribute in each area.

**Please note:** If you want to work on an issue, please ask the maintainers to assign the issue to you before starting work on it. This would help us understand who is working on an issue and prevent duplicate work. 🙏🏻

⚠️ If you just raise a PR, without the corresponding issue being assigned to you - it may not be accepted.

<hr>

# 3. Develop Frontend 🌝

Need to update [https://github.com/SigNoz/signoz/tree/main/frontend](https://github.com/SigNoz/signoz/tree/main/frontend)

### 3.1 Contribute to Frontend with Docker installation of SigNoz

- `git clone https://github.com/SigNoz/signoz.git && cd signoz`
- comment out frontend service section at `deploy/docker/clickhouse-setup/docker-compose.yaml#L62`
- run `cd deploy` to move to deploy directory
- Install signoz locally without the frontend
    - Add below configuration to query-service section at `docker/clickhouse-setup/docker-compose.yaml#L38`

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

### 3.2 Contribute to Frontend without installing SigNoz backend

If you don't want to install the SigNoz backend just for doing frontend development, we can provide you with test environments that you can use as the backend. Please ping us in the #contributing channel in our [slack community](https://signoz.io/slack) and we will DM you with `<test environment URL>`

- `git clone https://github.com/SigNoz/signoz.git && cd signoz/frontend`
- Create a file `.env` with `FRONTEND_API_ENDPOINT=<test environment URL>`
- `yarn install`
- `yarn dev`

**_Frontend should now be accessible at `http://localhost:3301/application`_**

<hr>

# 4. Contribute to Backend (Query-Service) 🌕

Need to update: [**https://github.com/SigNoz/signoz/tree/main/pkg/query-service**](https://github.com/SigNoz/signoz/tree/main/pkg/query-service)

### 4.1 To run ClickHouse setup (recommended for local development)

- Clone SigNoz,
```
git clone https://github.com/SigNoz/signoz.git
```
- run `cd signoz` to move to signoz directory,
- run `sudo make dev-setup` to configure local setup to run query-service,
- comment out frontend service section at [`docker/clickhouse-setup/docker-compose.yaml`,](https://github.com/SigNoz/signoz/blob/develop/deploy/docker/clickhouse-setup/docker-compose.yaml)
- comment out query-service section at [`docker/clickhouse-setup/docker-compose.yaml`,](https://github.com/SigNoz/signoz/blob/develop/deploy/docker/clickhouse-setup/docker-compose.yaml)
- add below configuration to clickhouse section at [`docker/clickhouse-setup/docker-compose.yaml`,](https://github.com/SigNoz/signoz/blob/develop/deploy/docker/clickhouse-setup/docker-compose.yaml)
```docker
    expose:
      - 9000
    ports:
      - 9001:9000
```

- run `cd pkg/query-service/` to move to `query-service` directory,
- Open [`./constants/constants.go`,](https://github.com/SigNoz/signoz/blob/develop/pkg/query-service/constants/constants.go)
    - Replace ```const RELATIONAL_DATASOURCE_PATH = "/var/lib/signoz/signoz.db"``` \
        with →  ```const RELATIONAL_DATASOURCE_PATH = "./signoz.db".```

- Now, install SigNoz locally **without** the `frontend` and `query-service`,
  - If you are using `x86_64` processors (All Intel/AMD processors) run `sudo make run-x86`
  - If you are on `arm64` processors (Apple M1 Macs) run `sudo make run-arm`

#### Run locally
```console
ClickHouseUrl=tcp://localhost:9001 STORAGE=clickhouse go run main.go
```

> Notes for Maintainers/Contributors who will change Line Numbers of Frontend & Query-Section. Please Update Line Numbers in `./scripts/commentLinesForSetup.sh`

**_Query Service should now be available at [http://localhost:8080](http://localhost:8080)_**

> If you want to see how the frontend plays with query service, you can run the frontend also in your local env with the baseURL changed to `http://localhost:8080` in file `src/constants/env.ts` as the query-service is now running at port `8080`

---
<!-- Instead of configuring a local setup, you can also use [Gitpod](https://www.gitpod.io/), a VSCode-based Web IDE.

Click the button below. A workspace with all required environments will be created.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/SigNoz/signoz)

> To use it on your forked repo, edit the 'Open in Gitpod' button URL to `https://gitpod.io/#https://github.com/<your-github-username>/signoz` -->

<hr>

# 5. Contribute to SigNoz Helm Chart

Need to update [https://github.com/SigNoz/charts](https://github.com/SigNoz/charts).

### 5.1 To run helm chart for local development

- run `git clone https://github.com/SigNoz/charts.git` followed by `cd charts`
- it is recommended to use lightweight kubernetes (k8s) cluster for local development:
  - [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
  - [k3d](https://k3d.io/#installation)
  - [minikube](https://minikube.sigs.k8s.io/docs/start/)
- create a k8s cluster and make sure `kubectl` points to the locally created k8s cluster
- run `make dev-install` to install SigNoz chart with `my-release` release name in `platform` namespace.
- run `kubectl -n platform port-forward svc/my-release-signoz-frontend 3301:3301` to make SigNoz UI available at [localhost:3301](http://localhost:3301)

**To install the HotROD sample app:**

```bash
curl -sL https://github.com/SigNoz/signoz/raw/main/sample-apps/hotrod/hotrod-install.sh \
  | HELM_RELEASE=my-release SIGNOZ_NAMESPACE=platform bash
```

**To load data with the HotROD sample app:**

```bash
kubectl -n sample-application run strzal --image=djbingham/curl \
  --restart='OnFailure' -i --tty --rm --command -- curl -X POST -F \
  'locust_count=6' -F 'hatch_rate=2' http://locust-master:8089/swarm
```

**To stop the load generation:**

```bash
kubectl -n sample-application run strzal --image=djbingham/curl \
  --restart='OnFailure' -i --tty --rm --command -- curl \
  http://locust-master:8089/stop
```

**To delete the HotROD sample app:**

```bash
curl -sL https://github.com/SigNoz/signoz/raw/main/sample-apps/hotrod/hotrod-delete.sh \
  | HOTROD_NAMESPACE=sample-application bash
```

---

Again, feel free to ping us on `#contributing` or `#contributing-frontend` on our slack community if you need any help on this :)


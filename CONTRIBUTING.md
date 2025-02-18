# Contributing Guidelines

## Welcome to SigNoz Contributing section 🎉

Hi there! We're thrilled that you'd like to contribute to this project, thank you for your interest. Whether it's a bug report, new feature, correction, or additional documentation, we greatly value feedback and contributions from our community.

Please read through this document before submitting any issues or pull requests to ensure we have all the necessary information to effectively respond to your bug report or contribution.

- We accept contributions made to the [SigNoz `develop` branch]()
- Find all SigNoz Docker Hub images here 
    - [signoz/frontend](https://hub.docker.com/r/signoz/frontend)
    - [signoz/query-service](https://hub.docker.com/r/signoz/query-service)
    - [signoz/otelcontribcol](https://hub.docker.com/r/signoz/otelcontribcol)

## Finding contributions to work on 💬

Looking at the existing issues is a great way to find something to contribute on. 
Also, have a look at these [good first issues label](https://github.com/SigNoz/signoz/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) to start with.


## Sections:
- [General Instructions](#1-general-instructions-) 
    - [For Creating Issue(s)](#11-for-creating-issues)
    - [For Pull Requests(s)](#12-for-pull-requests)
- [How to Contribute](#2-how-to-contribute-%EF%B8%8F)
- [Develop Frontend](#3-develop-frontend-)
  - [Contribute to Frontend with Docker installation of SigNoz](#31-contribute-to-frontend-with-docker-installation-of-signoz)
  - [Contribute to Frontend without installing SigNoz backend](#32-contribute-to-frontend-without-installing-signoz-backend)
- [Contribute to Backend (Query-Service)](#4-contribute-to-backend-query-service-)
    - [To run ClickHouse setup](#41-to-run-clickhouse-setup-recommended-for-local-development)
- [Contribute to SigNoz Helm Chart](#5-contribute-to-signoz-helm-chart-)
    - [To run helm chart for local development](#51-to-run-helm-chart-for-local-development)
- [Contribute to Dashboards](#6-contribute-to-dashboards-)
- [Other Ways to Contribute](#other-ways-to-contribute)

# 1. General Instructions 📝

## 1.1 For Creating Issue(s)
Before making any significant changes and before filing a new issue, please check [existing open](https://github.com/SigNoz/signoz/issues?q=is%3Aopen+is%3Aissue), or [recently closed](https://github.com/SigNoz/signoz/issues?q=is%3Aissue+is%3Aclosed) issues to make sure somebody else hasn't already reported the issue. Please try to include as much information as you can. 

**Issue Types** - [Bug Report](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=bug_report.md&title=) | [Feature Request](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=feature_request.md&title=) | [Performance Issue Report](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=performance-issue-report.md&title=) | [Request Dashboard](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=dashboard-template&projects=&template=request_dashboard.md&title=%5BDashboard+Request%5D+) | [Report a Security Vulnerability](https://github.com/SigNoz/signoz/security/policy)

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

Discussing your proposed changes ahead of time will make the contribution
process smooth for everyone 🙌.

 **[`^top^`](#contributing-guidelines)**
 
<hr>

## 1.2 For Pull Request(s)

Contributions via pull requests are much appreciated. Once the approach is agreed upon ✅, make your changes and open a Pull Request(s). 
Before sending us a pull request, please ensure that,

- Fork the SigNoz repo on GitHub, clone it on your machine.
- Create a branch with your changes.
- You are working against the latest source on the `develop` branch.
- Modify the source; please focus only on the specific change you are contributing.
- Ensure local tests pass.
- Commit to your fork using clear commit messages.
- Send us a pull request, answering any default questions in the pull request interface.
- Pay attention to any automated CI failures reported in the pull request, and stay involved in the conversation
- Once you've pushed your commits to GitHub, make sure that your branch can be auto-merged (there are no merge conflicts). If not, on your computer, merge main into your branch, resolve any merge conflicts, make sure everything still runs correctly and passes all the tests, and then push up those changes.
- Once the change has been approved and merged, we will inform you in a comment.


GitHub provides additional document on [forking a repository](https://help.github.com/articles/fork-a-repo/) and 
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

**Note:** Unless your change is small, **please** consider submitting different Pull Request(s):

* 1️⃣ First PR should include the overall structure of the new component:
  * Readme, configuration, interfaces or base classes, etc...
  * This PR is usually trivial to review, so the size limit does not apply to
    it.
* 2️⃣ Second PR should include the concrete implementation of the component. If the
  size of this PR is larger than the recommended size, consider **splitting** ⚔️ it into
  multiple PRs.
* If there are multiple sub-component then ideally each one should be implemented as
  a **separate** pull request.
* Last PR should include changes to **any user-facing documentation.** And should include
  end-to-end tests if applicable. The component must be enabled
  only after sufficient testing, and there is enough confidence in the
  stability and quality of the component.


You can always reach out to `ankit@signoz.io` to understand more about the repo and product. We are very responsive over email and [slack community](https://signoz.io/slack).

### Pointers:
- If you find any **bugs** → please create an [**issue.**](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=bug_report.md&title=)
- If you find anything **missing** in documentation → you can create an issue with the label **`documentation`**.
- If you want to build any **new feature** → please create an [issue with the label **`enhancement`**.](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=&template=feature_request.md&title=)
- If you want to **discuss** something about the product, start a new [**discussion**.](https://github.com/SigNoz/signoz/discussions)
- If you want to request a new **dashboard template** → please create an issue [here](https://github.com/SigNoz/signoz/issues/new?assignees=&labels=dashboard-template&projects=&template=request_dashboard.md&title=%5BDashboard+Request%5D+).

<hr>

### Conventions to follow when submitting Commits and Pull Request(s).

We try to follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), more specifically the commits and PRs **should have type specifiers** prefixed in the name. [This](https://www.conventionalcommits.org/en/v1.0.0/#specification) should give you a better idea.

e.g. If you are submitting a fix for an issue in frontend, the PR name should be prefixed with **`fix(FE):`**

- Follow [GitHub Flow](https://guides.github.com/introduction/flow/) guidelines for your contribution flows.

- Feel free to ping us on [`#contributing`](https://signoz-community.slack.com/archives/C01LWQ8KS7M) or [`#contributing-frontend`](https://signoz-community.slack.com/archives/C027134DM8B) on our slack community if you need any help on this :)

 **[`^top^`](#contributing-guidelines)**
 
<hr>

# 2. How to Contribute 🙋🏻‍♂️

#### There are primarily 2 areas in which you can contribute to SigNoz

- [**Frontend**](#3-develop-frontend-) (Written in Typescript, React)
- [**Backend**](#4-contribute-to-backend-query-service-) (Query Service,  written in Go)
- [**Dashboard Templates**](#6-contribute-to-dashboards-) (JSON dashboard templates built with SigNoz)

Depending upon your area of expertise & interest, you can choose one or more to contribute. Below are detailed instructions to contribute in each area.

**Please note:** If you want to work on an issue, please add a brief description of your solution on the issue before starting work on it.

 **[`^top^`](#contributing-guidelines)**
 
<hr>

# 3. Develop Frontend 🌚

**Need to Update: [https://github.com/SigNoz/signoz/tree/main/frontend](https://github.com/SigNoz/signoz/tree/main/frontend)**

Also, have a look at [Frontend README.md](https://github.com/SigNoz/signoz/blob/main/frontend/README.md) sections for more info on how to setup SigNoz frontend locally (with and without Docker).

## 3.1 Contribute to Frontend with Docker installation of SigNoz

- Clone the SigNoz repository and cd into signoz directory,
  ```
  git clone https://github.com/SigNoz/signoz.git && cd signoz
  ```
- Comment out `frontend` service section at [`deploy/docker/docker-compose.yaml#L68`](https://github.com/SigNoz/signoz/blob/main/deploy/docker/docker-compose.yaml#L68)

![develop-frontend](https://user-images.githubusercontent.com/52788043/179009217-6692616b-17dc-4d27-b587-9d007098d739.jpeg)


- run `cd deploy` to move to deploy directory,
- Install signoz locally **without** the frontend,
    - Add / Uncomment the below configuration to query-service section at [`deploy/docker/docker-compose.yaml#L47`](https://github.com/SigNoz/signoz/blob/main/deploy/docker/docker-compose.yaml#L47)
    ```
    ports:
      - "8080:8080"
    ```
<img width="869" alt="query service" src="https://user-images.githubusercontent.com/52788043/179010251-8489be31-04ca-42f8-b30d-ef0bb6accb6b.png">    
    
  - Next run,
    ```
    cd deploy/docker
    sudo docker compose up -d
    ```
- `cd ../frontend` and change baseURL in file [`frontend/src/constants/env.ts#L2`](https://github.com/SigNoz/signoz/blob/main/frontend/src/constants/env.ts#L2) and for that, you need to create a `.env` file in the `frontend` directory with the following environment variable (`FRONTEND_API_ENDPOINT`) matching your configuration.

    If you have backend api exposed via frontend nginx:
    ```
    FRONTEND_API_ENDPOINT=http://localhost:3301
    ```
    If not:
    ```
    FRONTEND_API_ENDPOINT=http://localhost:8080
    ```

- Next, 
  ```
  yarn install
  yarn dev
  ```

## 3.2 Contribute to Frontend without installing SigNoz backend

If you don't want to install the SigNoz backend just for doing frontend development, we can provide you with test environments that you can use as the backend. 

- Clone the SigNoz repository and cd into signoz/frontend directory,
  ```
  git clone https://github.com/SigNoz/signoz.git && cd signoz/frontend
  ````
- Create a file `.env` in the `frontend` directory with `FRONTEND_API_ENDPOINT=<test environment URL>`
- Next, 
  ```
  yarn install
  yarn dev
  ```

Please ping us in the [`#contributing`](https://signoz-community.slack.com/archives/C01LWQ8KS7M) channel or ask `@Prashant Shahi` in our [Slack Community](https://signoz.io/slack)  and we will DM you with `<test environment URL>`.

**Frontend should now be accessible at** [`http://localhost:3301/services`](http://localhost:3301/services)

 **[`^top^`](#contributing-guidelines)**
 
<hr>

# 4. Contribute to Backend (Query-Service) 🌑

**Need to Update: [https://github.com/SigNoz/signoz/tree/main/pkg/query-service](https://github.com/SigNoz/signoz/tree/main/pkg/query-service)**

## 4.1 Prerequisites

### 4.1.1 Install SQLite3

- Run `sqlite3` command to check if you already have SQLite3 installed on your machine.

- If not installed already, Install using below command
  - on Linux
    - on Debian / Ubuntu
      ```
        sudo apt install sqlite3
      ```
    - on CentOS / Fedora / RedHat
      ```
        sudo yum install sqlite3
      ```

## 4.2 To run ClickHouse setup (recommended for local development)

- Clone the SigNoz repository and cd into signoz directory,
    ```
    git clone https://github.com/SigNoz/signoz.git && cd signoz
    ```
- run `sudo make dev-setup` to configure local setup to run query-service,
- Comment out `frontend` service section at [`deploy/docker/docker-compose.yaml#L68`](https://github.com/SigNoz/signoz/blob/main/deploy/docker/docker-compose.yaml#L68)
<img width="982" alt="develop-frontend" src="https://user-images.githubusercontent.com/52788043/179043977-012be8b0-a2ed-40d1-b2e6-2ab72d7989c0.png">

- Comment out `query-service` section at [`deploy/docker/docker-compose.yaml#L41`,](https://github.com/SigNoz/signoz/blob/main/deploy/docker/docker-compose.yaml#L41)
<img width="1068" alt="Screenshot 2022-07-14 at 22 48 07" src="https://user-images.githubusercontent.com/52788043/179044151-a65ba571-db0b-4a16-b64b-ca3fadcf3af0.png">

- add below configuration to `clickhouse` section at [`deploy/docker/docker-compose.yaml`,](https://github.com/SigNoz/signoz/blob/main/deploy/docker/docker-compose.yaml)
  ```
  ports:
    - 9001:9000
  ```
<img width="1013" alt="Screenshot 2022-07-14 at 22 50 37" src="https://user-images.githubusercontent.com/52788043/179044544-a293d3bc-4c4f-49ea-a276-505a381de67d.png">

- run `cd pkg/query-service/` to move to `query-service` directory,
- Then, you need to create a `.env` file with the following environment variable 
    ```
    SIGNOZ_SQLSTORE_SQLITE_PATH="./signoz.db"
    ```
to set your local environment with the right `RELATIONAL_DATASOURCE_PATH` as mentioned in [`./constants/constants.go#L38`,](https://github.com/SigNoz/signoz/blob/main/pkg/query-service/constants/constants.go#L38)

- Now, install SigNoz locally **without** the `frontend` and `query-service`,
  - If you are using `x86_64` processors (All Intel/AMD processors) run `sudo make run-x86`
  - If you are on `arm64` processors (Apple M1 Macs) run `sudo make run-arm`

#### Run locally,
```
ClickHouseUrl=tcp://localhost:9001 STORAGE=clickhouse go run main.go
```

#### Build and Run locally
```
cd pkg/query-service
go build -o build/query-service main.go
ClickHouseUrl=tcp://localhost:9001 STORAGE=clickhouse build/query-service
```

#### Docker Images
The docker images of query-service is available at https://hub.docker.com/r/signoz/query-service

```
docker pull signoz/query-service
```

```
docker pull signoz/query-service:latest
```

```
docker pull signoz/query-service:develop
```

### Important Note:

**Query Service should now be available at** [`http://localhost:8080`](http://localhost:8080)

If you want to see how the frontend plays with query service, you can run the frontend also in your local env with the baseURL changed to `http://localhost:8080` in file [`frontend/src/constants/env.ts`](https://github.com/SigNoz/signoz/blob/main/frontend/src/constants/env.ts) as the `query-service` is now running at port `8080`.

<!-- Instead of configuring a local setup, you can also use [Gitpod](https://www.gitpod.io/), a VSCode-based Web IDE.

Click the button below. A workspace with all required environments will be created.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/SigNoz/signoz)

> To use it on your forked repo, edit the 'Open in Gitpod' button URL to `https://gitpod.io/#https://github.com/<your-github-username>/signoz` -->

 **[`^top^`](#contributing-guidelines)**
 
<hr>

# 5. Contribute to SigNoz Helm Chart 📊

**Need to Update: [https://github.com/SigNoz/charts](https://github.com/SigNoz/charts).**

## 5.1 To run helm chart for local development

- Clone the SigNoz repository and cd into charts directory,
    ```
    git clone https://github.com/SigNoz/charts.git && cd charts
    ``` 
- It is recommended to use lightweight kubernetes (k8s) cluster for local development:
  - [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
  - [k3d](https://k3d.io/#installation)
  - [minikube](https://minikube.sigs.k8s.io/docs/start/)
- create a k8s cluster and make sure `kubectl` points to the locally created k8s cluster,
- run `make dev-install` to install SigNoz chart with `my-release` release name in `platform` namespace,
- next run,
    ```
    kubectl -n platform port-forward svc/my-release-signoz-frontend 3301:3301
    ``` 
to make SigNoz UI available at [localhost:3301](http://localhost:3301)

**5.1.1 To install the HotROD sample app:**

```bash
curl -sL https://github.com/SigNoz/signoz/raw/main/sample-apps/hotrod/hotrod-install.sh \
  | HELM_RELEASE=my-release SIGNOZ_NAMESPACE=platform bash
```

**5.1.2 To load data with the HotROD sample app:**

```bash
kubectl -n sample-application run strzal --image=djbingham/curl \
  --restart='OnFailure' -i --tty --rm --command -- curl -X POST -F \
  'user_count=6' -F 'spawn_rate=2' http://locust-master:8089/swarm
```

**5.1.3 To stop the load generation:**

```bash
kubectl -n sample-application run strzal --image=djbingham/curl \
  --restart='OnFailure' -i --tty --rm --command -- curl \
  http://locust-master:8089/stop
```

**5.1.4 To delete the HotROD sample app:**

```bash
curl -sL https://github.com/SigNoz/signoz/raw/main/sample-apps/hotrod/hotrod-delete.sh \
  | HOTROD_NAMESPACE=sample-application bash
```

 **[`^top^`](#contributing-guidelines)**
 
---

# 6. Contribute to Dashboards 📈

**Need to Update: [https://github.com/SigNoz/dashboards](https://github.com/SigNoz/dashboards)**

To contribute a new dashboard template for any service, follow the contribution guidelines in the [Dashboard Contributing Guide](https://github.com/SigNoz/dashboards/blob/main/CONTRIBUTING.md). In brief:

1. Create a dashboard JSON file.
2. Add a README file explaining the dashboard, the metrics ingested, and the configurations needed.
3. Include screenshots of the dashboard in the `assets/` directory.
4. Submit a pull request for review.

## Other Ways to Contribute

There are many other ways to get involved with the community and to participate in this project:

- Use the product, submitting GitHub issues when a problem is found.
- Help code review pull requests and participate in issue threads.
- Submit a new feature request as an issue.
- Help answer questions on forums such as Stack Overflow and [SigNoz Community Slack Channel](https://signoz.io/slack).
- Tell others about the project on Twitter, your blog, etc.

Again, Feel free to ping us on [`#contributing`](https://signoz-community.slack.com/archives/C01LWQ8KS7M) or [`#contributing-frontend`](https://signoz-community.slack.com/archives/C027134DM8B) on our slack community if you need any help on this :)

Thank You!

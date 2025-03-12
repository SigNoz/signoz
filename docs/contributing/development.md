# Development

Welcome to the SigNoz development guide! This document will help you set up your local development environment and get started with contributing to SigNoz.

## Prerequisites

- [Git](https://git-scm.com/) is used as our version control system.

- [Go](https://go.dev/dl/) is used as our backend language. You can find the minimum version of the dependencies in the [go.mod](../../go.mod#L3) file.

- [GCC](https://gcc.gnu.org/) is used to compile CGO dependencies.

- [Node](https://nodejs.org) is used as our frontend language. You can find the minimum version of the dependencies in the [package.json](../../frontend/.nvmrc) file.

- [Yarn](https://yarnpkg.com/getting-started/install) is used as our frontend package manager.

- [Docker](https://docs.docker.com/get-docker/) makes it easy to setup local development environments for clickhouse and postgres.

> Familiarizing yourself with the [Makefile](../../Makefile) commands. `make help` will print most of available commands with relevant details.


## Download

Open a new terminal and run the following command to clone the repository.

```
git clone https://github.com/SigNoz/signoz.git
```

The command will create a new `signoz` directory in your current directory. Open the `signoz` directory in your favorite code editor.

## Build

SigNoz is built of 3 components (clickhouse, backend and frontend).

### Clickhouse

Before getting started with other components, you need to install clickhouse. Run the following command in the root of the repository to start clickhouse in devenv:

```
make devenv-clickhouse
```

This will start clickhouse in a single shard, single replica cluster with zookeeper and run the latest schema migrations. Next, we'll explain how to build and run the server that serves the apis for the frontend.

### Backend

Run the backend by running `make run-go` in the root directory of the repository. This command compiles the Go source code and starts the backend.
By default, the apiserver is accessible at `http://localhost:8080/`.

Try the following api to check if the backend is running:

```
curl http://localhost:8080/api/v1/health
```

If the backend is running, you should see a response like this:

```
{"status":"ok"}
```

### Frontend

Before you get started with the frontend, you need to install the related dependencies:

```
yarn install
```

Create a `.env` file in the `frontend` directory with the following environment variable (`FRONTEND_API_ENDPOINT`) matching the backend api endpoint. An example `.env` file is given below:

```
FRONTEND_API_ENDPOINT=http://localhost:8080
```

After the command has finished, you can start building the source code:

```
yarn dev
```

After `yarn dev` has built the assets, it will continue to do so whenever any of the files change. This means you don't have to manually build the assets every time you change the code.

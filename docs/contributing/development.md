# Development Guide

Welcome! This guide will help you set up your local development environment for SigNoz. Let's get you started! 🚀

## What do I need?

Before diving in, make sure you have these tools installed:

- **Git** - Our version control system
  - Download from [git-scm.com](https://git-scm.com/)

- **Go** - Powers our backend
  - Download from [go.dev/dl](https://go.dev/dl/)
  - Check [go.mod](../../go.mod#L3) for the minimum version

- **GCC** - Required for CGO dependencies
  - Download from [gcc.gnu.org](https://gcc.gnu.org/)

- **Node** - Powers our frontend
  - Download from [nodejs.org](https://nodejs.org)
  - Check [.nvmrc](../../frontend/.nvmrc) for the version

- **Yarn** - Our frontend package manager
  - Follow the [installation guide](https://yarnpkg.com/getting-started/install)

- **Docker** - For running Clickhouse and Postgres locally
  - Get it from [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)

> 💡 **Tip**: Run `make help` to see all available commands with descriptions

## How do I get the code?

1. Open your terminal
2. Clone the repository:
   ```bash
   git clone https://github.com/SigNoz/signoz.git
   ```
3. Navigate to the project:
   ```bash
   cd signoz
   ```

## How do I run it locally?

SigNoz has three main components: Clickhouse, Backend, and Frontend. Let's set them up one by one.

### 1. Setting up Clickhouse

First, we need to get Clickhouse running:

```bash
make devenv-clickhouse
```

This command:
- Starts Clickhouse in a single-shard, single-replica cluster
- Sets up Zookeeper
- Runs the latest schema migrations

### 2. Starting the Backend

1. Run the backend server:
   ```bash
   make go-run-community
   ```

2. Verify it's working:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```

   You should see: `{"status":"ok"}`

> 💡 **Tip**: The API server runs at `http://localhost:8080/` by default

### 3. Setting up the Frontend

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Create a `.env` file in the `frontend` directory:
   ```env
   FRONTEND_API_ENDPOINT=http://localhost:8080
   ```

3. Start the development server:
   ```bash
   yarn dev
   ```

> 💡 **Tip**: `yarn dev` will automatically rebuild when you make changes to the code

Now you're all set to start developing! Happy coding! 🎉

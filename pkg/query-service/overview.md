# Query Service Overview

The Query Service is a Golang-based interface between the frontend and various databases, primarily ClickHouse. It is designed to handle requests from the frontend, generate appropriate database queries, process the responses, and return the data in a format that the frontend can use.

## Key Responsibilities
- **Request Parsing**: It parses incoming requests from the frontend.
- **Query Generation**: It generates ClickHouse queries (and queries for other supported databases).
- **Response Handling**: It processes the responses from the databases, handling any errors that occur.
- **Data Formatting**: It formats the database responses to be compatible with the frontend requirements.

## Setup and Configuration
- **Local Setup**: Instructions for setting up ClickHouse locally are provided, including modifying Docker Compose files and running specific commands to start the services.
- **Environment Variables**: Several environment variables need to be set for the Query Service to function correctly, such as `ClickHouseUrl`, `STORAGE`, and `ALERTMANAGER_API_PREFIX`.

## Building and Running
- **Building**: The service can be built using Go commands.
- **Running**: The service can be run locally with specific environment variables and command-line options.

## Docker Integration
- **Dockerfile**: A minimal Alpine-based Dockerfile is used to build the Query Service container.
- **Docker Compose**: The service is configured to run in a Docker Compose setup, with dependencies on other services like ClickHouse and AlertManager.

## API Endpoints
The Query Service exposes several API endpoints to interact with the frontend:
- **Service Overview**: Provides an overview

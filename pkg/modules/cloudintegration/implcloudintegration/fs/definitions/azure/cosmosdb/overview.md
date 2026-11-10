### Monitor Azure Cosmos DB with SigNoz

Collect key Azure Cosmos DB metrics and view them with an out of the box dashboard.

This integration collects platform metrics for the `Microsoft.DocumentDB/databaseAccounts` resource type — the Request Unit (RU) based Azure Cosmos DB account. A single account resource type is used across all Cosmos DB APIs (NoSQL, Cassandra, Gremlin, Table, and MongoDB for RU), so per-API request metrics are only reported for the API your account uses.

Note: This integration is for the RU-based Cosmos DB account (`Microsoft.DocumentDB/databaseAccounts`).

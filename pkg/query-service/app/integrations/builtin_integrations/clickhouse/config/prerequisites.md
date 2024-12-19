## Before You Begin  

To configure metrics and logs collection for a Clickhouse server, you need the following.

### Ensure Clickhouse server is prepared for monitoring

- **Ensure that the Clickhouse server is running a supported version**  
  Clickhouse versions v23 and newer are supported.  
  You can use the following SQL statement to determine server version  
  ```SQL
  SELECT version();
  ```

- **If collecting metrics, ensure that Clickhouse is configured to export prometheus metrics**
  If needed, please [configure Clickhouse to expose prometheus metrics](https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#prometheus).

- **If collecting query_log, ensure that there is a clickhouse user with required permissions**
  To create a monitoring user for clickhouse, you can run:
  ```SQL
  CREATE USER monitoring IDENTIFIED BY 'monitoring_password';
  GRANT SELECT ON system.query_log to monitoring;

  -- If monitoring a clustered deployment, also grant privilege for executing remote queries
  GRANT REMOTE ON *.* TO 'monitoring' on CLUSTER 'cluster_name';
  ```


### Ensure OTEL Collector is running and has access to the Clickhouse server

- **Ensure that an OTEL collector is running in your deployment environment**  
  If needed, please [install SigNoz OTEL Collector](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/)  
  If already installed, ensure that the collector version is v0.88.0 or newer.  
  If collecting logs from system.query_log table, ensure that the collector version is v0.88.23 or newer.

  Also ensure that you can provide config files to the collector and that you can set environment variables and command line flags used for running it.  

- **Ensure that the OTEL collector can access the Clickhouse server**  
  In order to collect metrics, the collector must be able to reach clickhouse server and access the port on which prometheus metrics are being exposed.

  In order to collect server logs, the collector must be able to read the Clickhouse server log file.

  In order to collect logs from query_log table, the collector must be able to reach the server and connect to it as a clickhouse user with required permissions.

## Before You Begin  

To configure metrics and logs collection for a Postgres server, you need the following.

### Ensure Postgres server is prepared for monitoring

- **Ensure that the Postgres server is running a supported version**  
  Postgres versions 9.6+ are supported.  
  You can use the following SQL statement to determine server version  
  ```SQL
  SELECT version();
  ```

- **If collecting metrics, ensure that there is a Postgres user with required permissions**  
  To create a monitoring user for Postgres versions 10+, run:  
  ```SQL
  create user monitoring with password '<PASSWORD>';
  grant pg_monitor to monitoring;
  grant SELECT ON pg_stat_database to monitoring;
  ```  
  
  To create a monitoring user for Postgres versions >= 9.6 and <10, run:  
  ```SQL
  create user monitoring with password '<PASSWORD>';
  grant SELECT ON pg_stat_database to monitoring;
  ```
    

### Ensure that an OTEL Collector is running with access to the Postgres server

- **Ensure that an OTEL collector is running in your deployment environment**  
  If needed, please [install an OTEL Collector](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/)  
  If already installed, ensure that you can provide config to the collector with environment variables and command line flags.  

- **Ensure that the OTEL collector can access the Postgres server**  
  In order to collect metrics, the collector must be able to access the Postgres server as a client using the monitoring user.  
  In order to collect logs, The collector must be able to read the Postgres server log file.

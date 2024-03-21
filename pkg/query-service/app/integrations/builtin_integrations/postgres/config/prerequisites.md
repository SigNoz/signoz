## Prerequisites

### Prepare postgres for monitoring

- Have a running postgresql instance
- Have the monitoring user created
- Have the monitoring user granted the necessary permissions

This receiver supports PostgreSQL versions 9.6+

For PostgreSQL versions 10+, run:

```sql
create user monitoring with password '<PASSWORD>';
grant pg_monitor to monitoring;
grant SELECT ON pg_stat_database to monitoring;
```

For PostgreSQL versions >= 9.6 and <10, run:

```sql
create user monitoring with password '<PASSWORD>';
grant SELECT ON pg_stat_database to monitoring;
```
  

### Install Otel Collector

To start gathering postgres logs and metrics, please [install otel collector](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) in your deployment.

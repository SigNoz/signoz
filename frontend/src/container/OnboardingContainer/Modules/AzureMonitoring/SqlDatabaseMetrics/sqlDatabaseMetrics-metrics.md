## Prerequisite

- Azure subscription and Database instance running
- Central Collector Setup
- [SQL monitoring profile](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-insights-enable?view=azuresql#create-sql-monitoring-profile) created to monitor the databases in Azure Monitor

&nbsp;


## Setup

Once you have completed the prerequisites, you can start monitoring your Database's system metrics with SigNoz. Here's how you can do it:

1. Log in to your SigNoz account.
2. Navigate to the Dashboards Section, and [add an dashboard](https://signoz.io/docs/userguide/manage-dashboards/)
3. Add a Timeseries Panel
4. In **Metrics**, select `azure_storage_maximum` and **Avg By** select tag `location`
5. In Filter say `name = <database-name>`
6. Hit “Save Changes”. You now have Memory Usage of your Database in a Dashboard for reporting and alerting 

That's it! You have successfully set up monitoring for your Database's system metrics with SigNoz.

&nbsp;

**NOTE:**
Make sure you have created a sql monitoring profile in Azure Monitor if not, follow this guide to [Create SQL Monitoring Profile](https://learn.microsoft.com/en-us/azure/azure-sql/database/sql-insights-enable?view=azuresql#create-sql-monitoring-profile).
You can monitor multiple databases in a single profile.

&nbsp;

If you encounter any difficulties, please refer to this [troubleshooting section](https://signoz.io/docs/azure-monitoring/db-metrics/#troubleshooting) 
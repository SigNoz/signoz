Follow these steps if you want to monitor System metrics like CPU Percentage, Memory Percentage etc. of your Azure App Service.

&nbsp;

## Prerequisites

- EventHub Setup
- Central Collector Setup

## Dashboard Example

Once you have completed the prerequisites, you can start monitoring your Azure App Service's system metrics with SigNoz Cloud. Here's how you can do it:

1. Log in to your SigNoz account
2. Navigate to the Dashboards section, and [add a dashboard](https://signoz.io/docs/userguide/manage-dashboards/)
3. Add a Timeseries Panel
4. In **Metrics**, select `azure_memorypercentage_total`  and **Avg By** select tag `location`
5. In Filter say `name = <app-svc-plan-name>`
6. Hit “Save Changes” and you now have Memory Usage of your App Service in a Dashboard for reporting and alerting 

In this way, you can monitor system metrics of your Azure App Service in SigNoz Cloud.

&nbsp;

If you encounter any difficulties, please refer to this [troubleshooting section](https://signoz.io/docs/azure-monitoring/app-service/metrics/#troubleshooting) 
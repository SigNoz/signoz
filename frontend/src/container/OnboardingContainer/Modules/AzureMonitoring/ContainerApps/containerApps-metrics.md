Follow these steps if you want to monitor System metrics like CPU Percentage, Memory Percentage etc. of your Azure Container App.

&nbsp;

## Prerequisites

- Azure subscription and an Azure Container App instance running
- Central Collector Setup

&nbsp;

# Dashboard Example

Once you have completed the prerequisites, you can start monitoring your Azure Container App's system metrics with SigNoz. Here's how you can do it:

1. Log in to your SigNoz account.
2. Navigate to the Dashboards, and [add an dashboard](https://signoz.io/docs/userguide/manage-dashboards/)
3. Add a Timeseries Panel
4. In **Metrics**, select `azure_replicas_count`  and **Avg By** select tag `name`
5. In Filter say `type = Microsoft.App/containerApps`
6. Hit “Save Changes”. You now have Memory Usage of your Container App in a Dashboard for reporting and alerting 

In this way, you can monitor system metrics of your Azure Container App in SigNoz!

&nbsp;

If you encounter any difficulties, please refer to this [troubleshooting section](https://signoz.io/docs/azure-monitoring/az-container-apps/metrics/#troubleshooting) 
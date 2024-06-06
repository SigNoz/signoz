Follow these steps if you want to monitor System metrics like CPU Percentage, Memory Percentage etc. of your Azure App Service.

&nbsp;

## Prerequisites

- Setup EventHub and Central Collector mentioned in previous steps


## Setup Dashboard

Once you have set up the prerequisites, you can [create a Dashboard](https://signoz.io/docs/userguide/manage-panels/) in SigNoz to monitor your metrics.

As an example, here's how you can track Memory Usage of your App Service

1. Navigate to the Dashboards section of SigNoz, and add an dashboard.

2. Add a Timeseries Panel

3. In Metrics, select **azure_memorypercentage_total** and Avg By select tag location.

4. In Filter say name = <app-svc-plan-name>

5. Hit “Save Changes” You now have Memory Usage of your App Service in a Dashboard for reporting and alerting.




In this way, you can monitor system metrics of your Azure App Service in SigNoz!
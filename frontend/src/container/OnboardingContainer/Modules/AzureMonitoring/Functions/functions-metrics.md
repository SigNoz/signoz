Follow these steps if you want to monitor System metrics like CPU Percentage, Memory Percentage etc. of your Azure Functions.

&nbsp;

## Prerequisites

- Azure subscription and an Azure Container App instance running
- Central Collector Setup

&nbsp;

## Dashboard Example

Once you have completed the prerequisites, you can start monitoring your Azure Function's system metrics with SigNoz. Here's how you can do it:

1. Log in to your SigNoz account.
2. Navigate to the Dashboards, and add an dashboard
3. Add a Timeseries Panel
4. In *Metrics*, select `azure_requests_total`  and *Avg By* select tag `location`
5. In Filter say `name = <function-name>`
6. Hit “Save Changes” You now have Total Requests of your Azure Function in a Dashboard for reporting and alerting 


That's it! You have successfully set up monitoring for your Azure Function's system metrics with SigNoz.

&nbsp;

If you encounter any difficulties, please refer to this [troubleshooting section](https://signoz.io/docs/azure-monitoring/az-fns/metrics/#troubleshooting) 
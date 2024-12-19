Follow these steps if you want to monitor system metrics like Total Requests, Total Ingress / Egress, and Total Errors etc., of your Azure Blob Storage.

&nbsp;

## Prerequisites

- Azure Subscription and Azure Blob storage instance running
- Central Collector Setup

&nbsp;

## Dashboard Example

Once you have completed the prerequisites, you can start monitoring your Azure Blob Storage's system metrics with SigNoz.

1. Log in to your SigNoz account.
2. Navigate to the Dashboards, and [add a dashboard](https://signoz.io/docs/userguide/manage-dashboards/)
3. Add a Timeseries Panel
4. In **Metrics**, select `azure_ingress_total`  and **Avg B*y* select tag `location`
5. In Filter say `name = <storage-account-name>`
6. Hit “Save Changes”. You now have Total Ingress of your Azure Blob Storage in a Dashboard for reporting and alerting


That's it! You have successfully set up monitoring for your Azure Blob Storage's system metrics with SigNoz. You can now start creating other panels and dashboards to monitor other Azure Blob Storage's metrics.

&nbsp;

If you encounter any difficulties, please refer to this [troubleshooting section](https://signoz.io/docs/azure-monitoring/az-blob-storage/metrics/#troubleshooting) 
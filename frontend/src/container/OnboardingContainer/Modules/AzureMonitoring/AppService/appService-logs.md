Follow these steps if you want to setup logging for your Azure App Service.

&nbsp;

## Prerequisites

- EventHub Setup
- Central Collector Setup


## Setup

1. Navigate to your App Service in the Azure portal

2. Search for "Diagnostic settings" in the left navigation menu

3. Click on "Add Diagnostic Setting"

4. Select the desired log categories to export:
- HTTP logs
- App Service Console Logs
- App Service Application Logs
- Access Audit Logs
- IPSecurity Audit logs
- App Service Platform logs


5. Configure the destination details as **"Stream to an Event Hub"** and select the Event Hub namespace and Event Hub name created during the EventHub Setup in the earlier steps.

6. Save the diagnostic settings


This will start sending your Azure App Service Logs to SigNoz!
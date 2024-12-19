Follow these steps if you want to setup logging for your Azure Container App.

&nbsp;

## Prerequisites

- EventHub Setup
- Central Collector Setup


## Setup

1. Navigate to your Container Apps in the Azure portal
2. Click on "Container Apps Environment" to open the Container Apps Environment
3. Search for "Diagnostic settings" in the left navigation menu
4. Click on "Add Diagnostic Setting"
5. Select the desired log categories to export:
    - Container App console logs
    - Container App system logs
    - Spring App console logs


6. Configure the destination details as **"Stream to an Event Hub"** and select the Event Hub namespace and Event Hub name created during the EventHub Setup.

7. Save the diagnostic settings


That's it! You have successfully set up logging for your Azure Container App. 
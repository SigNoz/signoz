Follow these steps if you want to setup logging for your Azure App Service.

&nbsp;

## Prerequisites

- EventHub Setup
- Central Collector Setup

## Setup

1. Navigate to the relevant Storage Account in the Azure portal
2. Search for "Diagnostic settings" in the left navigation menu
3. Click on `blob` under the storage account
4. Click on "Add Diagnostic Setting"
5. Select the desired log categories to export:
    - Storage Read
    - Storage Write
    - Storage Delete
5. Configure the destination details as "**Stream to an Event Hub**" and select the Event Hub namespace and Event Hub name created during the EventHub Setup
6. Save the diagnostic settings

That's it! You have successfully set up logging for your Azure Blob Storage.
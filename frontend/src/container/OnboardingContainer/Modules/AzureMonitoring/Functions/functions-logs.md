Follow these steps if you want to setup logging for your Azure Functions.

&nbsp;

## Prerequisites

- EventHub Setup
- Central Collector Setup


## Setup

1. Navigate to your Azure Function in the Azure portal
2. Search for "Diagnostic settings" in the left navigation menu
3. Click on "Add Diagnostic Setting"
4. Select the desired log categories to export:
    - Function App logs
5. Configure the destination details as "**Stream to an Event Hub**" and select the Event Hub namespace and Event Hub name created during the EventHub Setup
6. Save the diagnostic settings

That's it! You have successfully set up logging for your Azure Function.
## Overview

Azure Event Hubs is a big data streaming platform ideal for centralizing logging and real-time log streaming for applications on Azure or on-premises.

Integrate SigNoz with Azure Event Hubs for a robust log management solution, leveraging SigNoz's log aggregation, querying, visualization, and alerting features.

## Prerequisites

- An active Azure subscription

## Setup

### 1. Create an Event Hubs Namespace

1. In the [Azure portal](https://portal.azure.com), create an Event Hubs namespace.
2. Fill in the required details:
    - **Resource group**: Choose or create a new one.
    - **Namespace name**: Enter a unique name, e.g., `<orgName>-obs-signoz`.
    - **Pricing tier**: Based on your logging requirements.
    - **Region**: Should match the region of the resources you want to monitor.
    - **Throughput units**: Choose based on logging needs.
3. Click "Review + create" and then "Create".

### 2. Create an Event Hub

1. Navigate to the Event Hubs namespace you created in the Azure portal.
2. Click "+ Event Hub" to create a new event hub.
3. Enter a name, e.g., `logs`and click "Create"

### 3. Create a SAS Policy and Copy Connection String

1. Navigate to the Event Hub in the Azure portal.
2. Click "Shared access policies" in the left menu.
3. Click "Add" to create a new policy named `signozListen`.
4. Select the "Listen" permission and set the expiration time.
5. Click "Save".
6. Copy the *Connection string–primary key*.

<!-- ### 4. Configure OpenTelemetry Integration

1. Add a new receiver to [Central Collector Setup](../collector-setup).
2. Configure the receiver with the Event Hubs namespace connection string and the event hub name.

### 5. Stream Logs to Event Hubs

1. Configure Azure services' diagnostic settings to forward logs to the Event Hub.
2. Ensure logs are in [Azure Common Log Format](https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/resource-logs-schema).
3. Verify logs are streaming to Event Hubs and received by SigNoz.

For detailed instructions, refer to the Azure documentation: [Azure Event Hub](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-create). -->

<!-- For more configuration options, see the [OpenTelemetry Documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/azureeventhubreceiver). -->



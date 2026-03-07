## Setup

### Installing with OpenTelemetry Helm Charts

Prior to installation, you must ensure your Kubernetes cluster is ready and that you have the necessary permissions to deploy applications. Follow these steps to use Helm for setting up the Collector:

&nbsp;

1. **Add the OpenTelemetry Helm repository:**

```bash
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
```

&nbsp;

2. **Prepare the `otel-collector-values.yaml` Configuration**

&nbsp;

#### Azure Event Hub Receiver Configuration

  Replace the placeholders `<Primary Connection String>` with the primary connection string for your Event Hub, it should look something like this:

  ```yaml
  connection: Endpoint=sb://namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=superSecret1234=;EntityPath=hubName
  ```
  The Event Hub setup have a step to create a SAS policy for the event hub and copy the connection string.

&nbsp;

#### Azure Monitor Receiver Configuration

  You will need to set up a [service principal](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal) with Read permissions to receive data from Azure Monitor.

  1. Follow the steps in the [Create a service principal Azure Doc](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#register-an-application-with-microsoft-entra-id-and-create-a-service-principal) documentation to create a service principal. 
  You can name it `signoz-central-collector-app` the redirect URI can be empty.
  2. To add read permissions to Azure Monitor, Follow the [Assign Role](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#assign-a-role-to-the-application) documentation. The read acess can be given to the full subscription.
  3. There are multiple ways to authenticate the service principal, we will use the client secret option, follow [Creating a client secret](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#option-3-create-a-new-client-secret) and don't forget to copy the client secret. The secret is used in the configuration file as `client_secret`.

  4. To find `client_id` and `tenant_id`, go to the [Azure Portal](https://portal.azure.com/) and search for the `Application` you created. You would see the `Application (client) ID` and `Directory (tenant) ID` in the Overview section.

  5. To find `subscription_id`, follow steps in [Find Your Subscription](https://learn.microsoft.com/en-us/azure/azure-portal/get-subscription-tenant-id#find-your-azure-subscription) and populate them in the configuration file.
  
  6. Ensure you replace the placeholders `<region>` and `<ingestion-key>` with the appropriate values for your signoz cloud instance.



Below is an example targeting the SigNoz backend with Azure Monitor receivers configured:

```yaml
service:
  pipelines:
    metrics/am:
      receivers: [azuremonitor]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otlp, azureeventhub]
      processors: [batch]
      exporters: [otlp]
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  azureeventhub:
    connection: Endpoint=sb://namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=superSecret1234=;EntityPath=hubName
    format: "azure"
    apply_semantic_conventions: true
  azuremonitor:
    subscription_id: "<Subscription ID>"
    tenant_id: "<AD Tenant ID>"
    client_id: "<Client ID>"
    client_secret: "<Client Secret>"
    resource_groups: ["<rg-1>"]
    collection_interval: 60s
processors:
  batch: {}
exporters:
  otlp:
    endpoint: "ingest.{{REGION}}.signoz.cloud:443"
    tls:
      insecure: false
    headers:
      "signoz-ingestion-key": "{{SIGNOZ_INGESTION_KEY}}"
```

&nbsp;

3. **Deploy the OpenTelemetry Collector to your Kubernetes cluster:**

You'll need to prepare a custom configuration file, say `otel-collector-values.yaml`, that matches your environment's specific needs. Replace `<namespace>` with the Kubernetes namespace where you wish to install the Collector.

```bash
helm install -n <namespace> --create-namespace otel-collector open-telemetry/opentelemetry-collector -f otel-collector-values.yaml

```

For more detail, refer to the [official OpenTelemetry Helm Chart documentation](https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-collector), which offers comprehensive installation instructions and configuration options tailored to your environment's requirements.

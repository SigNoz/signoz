Set up the OpenTelemetry Collector on a Virtual Machine (VM). The setup is compatible with cloud VM instances, your own data center, or even a local VM on your development machine. Here's how to do it:


## Download and Install the OpenTelemetry Collector Binary

Please visit [Documentation For VM](https://signoz.io/docs/tutorial/opentelemetry-binary-usage-in-virtual-machine/) which  provides further guidance on a VM installation. 

&nbsp;

## Configure OpenTelemetry Collector

While following the documentation above for installing the OpenTelemetry Collector Binary, you must have created `config.yaml` file. Replace the content of the `config.yaml` with the below config file which includes the **Azure Monitor receiver**.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  azureeventhub:
    connection: <Primary Connection String>
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

```
**NOTE:** 
Replace the `<Primary Connection String>` in the config file with the primary connection string for your Event Hub that you created in the previous section. It would look something like this:

```bash
Endpoint=sb://namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=superSecret1234=;EntityPath=hubName
```

&nbsp;

## Azure Monitor Receiver Configuration

You will need to set up a [service principal](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal) with Read permissions to receive data from Azure Monitor.

1. Follow the steps in the [Create a service principal Azure Doc](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#register-an-application-with-microsoft-entra-id-and-create-a-service-principal) documentation to create a service principal. 
You can name it `signoz-central-collector-app` the redirect URI can be empty.

2. To add read permissions to Azure Monitor, Follow the [Assign Role](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#assign-a-role-to-the-application) documentation. The read access can be given to the full subscription.

3. There are multiple ways to authenticate the service principal, we will use the client secret option, follow [Creating a client secret](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal#option-3-create-a-new-client-secret) and don't forget to copy the client secret. The secret is used in the configuration file as `client_secret`.

4. To find `client_id` and `tenant_id`, go to the [Azure Portal](https://portal.azure.com/) and search for the `Application` you created. You would see the `Application (client) ID` and `Directory (tenant) ID` in the Overview section.

5. To find `subscription_id`, follow steps in [Find Your Subscription](https://learn.microsoft.com/en-us/azure/azure-portal/get-subscription-tenant-id#find-your-azure-subscription) and populate them in the configuration file.

**NOTE:**
By following the above steps, you will get the values for `<Subscription ID>`, `<AD Tenant ID>`, `<Client ID>` and `<Client Secret>` which you need to fill in the `config.yaml` file.

&nbsp;

## Run the Collector
    
With your configuration file ready, you can now start the Collector using the following command:

```bash
# Runs in background with the configuration we just created
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid 
```

&nbsp;

### Open Ports
    
You will need to open the following ports on your Azure VM:
- 4317 for gRPC
- 4318 for HTTP

You can do this by navigating to the Azure VM's Networking section and adding a new inbound rule for the ports.
    
&nbsp;

### Validating the Deployment
    
Once the Collector is running, ensure that telemetry data is being successfully sent and received. Use the logging exporter as defined in your configuration file, or check the logs for any startup errors.

&nbsp;

## Configure DNS label For Collector

To the IP address of the collector, you can add a DNS label to the Public IP address. This will make it easier to refer to the centralized collector from other services. You can do this by following these steps:

1. Go to the Public IP address of the collector. This would be the IP address of the VM or Load Balancer in case of Kubernetes or Load Balanced collector.
2. Click on the "Configuration" tab.
3. Enter the DNS label you want to use for the collector.
4. Click on "Save".
    
**NOTE:** Please take note of the DNS label you have entered. You will need this in the next steps.

&nbsp;

If you encounter any difficulties, please refer to this [troubleshooting section](https://signoz.io/docs/azure-monitoring/bootstrapping/collector-setup/#troubleshooting)
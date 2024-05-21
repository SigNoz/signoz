**NOTE** : If you don't want to send traces data of your application, you can skip this step.

&nbsp;

## Send Traces Data

To send traces data from applications deployed in ECS to SigNoz Cloud using sidecar container we created in the previous steps, follow these steps:

### Step 1: Instrument your application
To add OpenTelemetry instrumentation to your application, check out the Application Monitoring section in onboarding you can follow the docs [here](https://signoz.io/docs/instrumentation/).

&nbsp;

### Step 2: Configure OTLP Endpoint

In your application task definition, you need to set the OTLP endpoint to the endpoint of the sidecar container. This can be done by setting the environment variable `OTEL_EXPORTER_OTLP_ENDPOINT` to the endpoint of the sidecar container.

Depending on the Network Mode, the ECS task definition will change:

For **Bridge** network mode, ECS task definition will be:

```json
{
    ...
    "containerDefinitions": [
        {
            "name": "<your-container-name>",
            "environment": [
                {
                    "name": "OTEL_EXPORTER_OTLP_ENDPOINT",
                    "value": "http://signoz-collector:4317"
                },
                {
                    "name": "OTEL_RESOURCE_ATTRIBUTES",
                    "value": "service.name=<your-service-name>"
                }
            ],
            "links": [
                "signoz-collector"
            ],
            ...
        }
    ]
}
```
&nbsp;

For **AWS VCP** network mode, ECS task definition will be:

```json
{
    ...
    "containerDefinitions": [
        {
            "name": "<your-container-name>",
            "environment": [
                {
                    "name": "OTEL_EXPORTER_OTLP_ENDPOINT",
                    "value": "http://localhost:4317"
                },
                {
                    "name": "OTEL_RESOURCE_ATTRIBUTES",
                    "value": "service.name=<your-service-name>"
                }
            ],
            ...
        }
    ]
}
```

Replace `<your-container-name>` with the name of your container.

&nbsp;

### Step 3: Rebuild and Deploy Application Container

After instrumenting your application and configuring the OTLP endpoint, you'll need to rebuild your application container with these changes and deploy it to ECS cluster using the same task definition that we used in the previous section.

&nbsp;

### Step 4: Verify Data in SigNoz

Generate some traffic to your application and go to your SigNoz cloud **Services** page to see your application name in the service list.

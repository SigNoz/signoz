**NOTE** : If you don't want to send traces data of your application, you can skip this step.

&nbsp;

## Send Traces Data

To send traces data from applications deployed in ECS to SigNoz Cloud using Daemon Service we created in the previous section, follow these steps:

### Step 1: Instrument your application
To add OpenTelemetry instrumentation to your application, check out the Application Monitoring section in onboarding you can follow the docs [here](https://signoz.io/docs/instrumentation/).

&nbsp;

### Step 2: Add Entrypoint to your Application Container

Add an entrypoint to the application container to set the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable to the endpoint of the daemon service. 

Obtain the endpoint or IP address of the instance on which the task is running. This can be done by querying the metadata service of the instance. For **EC2**, the metadata service is available at **169.254.169.254**.

The `entryPoint` will look like:

```yaml
{
      ...,
      "entryPoint": [
        "sh",
        "-c",
        "export OTEL_EXPORTER_OTLP_ENDPOINT=\"http://$(curl http://169.254.169.254/latest/meta-data/local-ipv4):4317\"; <Application Startup Commands>"
      ],
            "command": [],
            ...
}
```

Replace `<Application Startup Commands>` with the commands to start your application.

&nbsp;


### Step 3: Add Service Name of your Application

To add the service name of your application, you need to set the `OTEL_RESOURCE_ATTRIBUTES` environment variable of the application container to `service.name=<your-service-name>`.

In your task definition, add the following lines: 

```bash

...
    ContainerDefinitions:
        - Name: <your-container-name>
          ...
          Environment:
            - Name: OTEL_RESOURCE_ATTRIBUTES
              Value: service.name=<your-service-name>
          ...
...
```

If you are using JSON for task definition, then add the following lines:

```bash
...
    "containerDefinitions": [
        {
            "name": "<your-container-name>",
            ...
            "environment": [
                {
                    "name": "OTEL_RESOURCE_ATTRIBUTES",
                    "value": "service.name=<your-service-name>"
                }
            ],
            ...
        }
    ],
...

```

&nbsp;

### Step 4: Rebuild and Deploy Application Container

Once you follow the above steps, you need to rebuild the application container and deploy it to ECS cluster.

&nbsp;

### Step 5: Verify Data in SigNoz

Generate some traffic to your application and go to your SigNoz cloud **Services** page to see your application name in the service list.

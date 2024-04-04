**NOTE** : If you don't want to send logs data of your applications deployed on ECS, you can skip this step.

## Send Logs Data

To send logs data from applications deployed in ECS to SigNoz Cloud using sidecar container we created in the previous steps, follow these steps:

### Step 1: Configure Log Router

Add a new container definition in your ECS task definition for the Fluent Bit log router:

```json
{
    ...
    {
        "name": "signoz-log-router",
        "image": "906394416424.dkr.ecr.us-west-2.amazonaws.com/aws-for-fluent-bit:stable",
        "cpu": 250,
        "memory": 512,
        "essential": true,
        "dependsOn": [
            {
                "containerName": "signoz-collector",
                "condition": "HEALTHY"
            }
        ],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-create-group": "True",
                "awslogs-group": "/ecs/ecs-signoz-log-router",
                "awslogs-region": "us-east-1",
                "awslogs-stream-prefix": "ecs"
            }
        },
        "firelensConfiguration": {
            "type": "fluentbit",
            "options": {
                "enable-ecs-log-metadata": "true"
            }
        }
    }
}
```

**NOTE:** When collecting logs from multiple applications, it is recommended to use `<application-name>-log-router` pattern instead of `signoz-log-router` for container name and `awslogs-group`. It helps to separate log router of different application.

&nbsp;

### Step 2: Send logs to Sidecar Container

In your application task definition, you need to use `awsfirelens` log driver to send logs to the sidecar otel-collector container via Fluent Bit log router.

Depending on the Network Mode, update the ECS task definition:

For **Bridge** network mode:

```json
{
    ...
    "containerDefinitions": [
        {
            "name": "<your-container-name>",
            "dependsOn": [
                {
                    "containerName": "signoz-log-router",
                    "condition": "START"
                }
            ],
            "logConfiguration": {
                "logDriver": "awsfirelens",
                "options": {
                    "Name": "forward",
                    "Match": "*",
                    "Host": "signoz-collector",
                    "Port": "8006",
                    "tls": "off",
                    "tls.verify": "off"
                }
            },
            "links": [
                "signoz-collector"
            ],
            ...
        }
    ]
}
```

&nbsp;

For **AWS VCP** network mode:

```json
{
    ...
    "containerDefinitions": [
        {
            "name": "<your-container-name>",
            "dependsOn": [
                {
                    "containerName": "signoz-log-router",
                    "condition": "START"
                }
            ],
            "logConfiguration": {
                "logDriver": "awsfirelens",
                "options": {
                    "Name": "forward",
                    "Match": "*",
                    "Host": "localhost",
                    "Port": "8006",
                    "tls": "off",
                    "tls.verify": "off"
                }
            }
            ...
        }
    ]
}
```

### Step 3: Rebuild and Deploy Application Container

Rebuild your application container and deploy it to ECS cluster using the same task definition that we updated in the previous section.

&nbsp;

### Step 4: Verify Data in SigNoz

Generate some logs from your application and go to your SigNoz cloud **Logs** page to see your application logs.




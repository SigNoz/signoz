## Create Sidecar Collector Container

This step involves integrating the SigNoz collector into your ECS task definitions as a sidecar container. The sidecar collector container will run alongside your application container(s) within the same ECS task and will collect ECS container metrics and send them to SigNoz Cloud. Follow these steps to create the Sidecar collector container:

### Step 1: Update task definition of your application

In your ECS task definition, include a new container definition specifically for the sidecar container. This container will operate alongside your main application container(s) within the same task definition. The JSON configuration for that will look like this:

```json
{
    ...
    "containerDefinitions": [
        ...,
        {
            "name": "signoz-collector",
            "image": "signoz/signoz-otel-collector:0.88.13",
            "user": "root",
            "command": [
                "--config=env:SIGNOZ_CONFIG_CONTENT"
            ],
            "secrets": [
                {
                "name": "SIGNOZ_CONFIG_CONTENT",
                "valueFrom": "/ecs/signoz/otelcol-sidecar.yaml"
                }
            ],
            "memory": 1024,
            "cpu": 512,
            "essential": true,
            "portMappings": [
                {
                    "protocol": "tcp",
                    "containerPort": 4317
                },
                {
                    "protocol": "tcp",
                    "containerPort": 4318
                },
                {
                    "containerPort": 8006,
                    "protocol": "tcp"
                }
            ],
            "healthCheck": {
                "command": [
                    "CMD-SHELL",
                    "wget -qO- http://localhost:13133/ || exit 1"
                ],
                "interval": 5,
                "timeout": 6,
                "retries": 5,
                "startPeriod": 1
            },
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                "awslogs-group": "/ecs/signoz-otel-EC2-sidcar",
                "awslogs-region": "<aws-region>",
                "awslogs-stream-prefix": "ecs",
                "awslogs-create-group": "True"
                }
            }
        }
    ]
...
}
```

Replace `<aws-region>` with the Region for your ECS cluster. For example, **us-east-1**

&nbsp;

### Step 2: Update ECS Task Execution Role

To update the Task Execution role, follow these steps:

1. **Identify the Role:** Identify the IAM role used by your ECS tasks for execution. It's often named something like **ecsTaskExecutionRole**.

2. **Edit the Role:** Navigate to the IAM console in the AWS Management Console, find the role by name, and open its details page.

3. **Attach Policy or add inline Policy:**

There are two ways to grant access to the Parameter store:

- **Attach AWS Managed Policies:** If the role doesn't already have the following policy, attach it:

    - `AmazonSSMReadOnlyAccess`

- **Add Inline Policy:** Alternatively, for more granular control, you can create an inline policy that specifically grants access to only the necessary resources in the Parameter Store. The JSON for the inline policy will be:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "ssm:GetParameter"
            ],
            "Resource": [
                "arn:aws:ssm:<aws-region>:<aws-account-id>:parameter/ecs/signoz/otelcol-sidecar.yaml"
            ],
            "Effect": "Allow"
        }
    ]
}
```

&nbsp;

### Step 3: Update ECS Task Role

To update the ECS Task Role, follow these steps:

1. **Identify the Role:** Determine the IAM role your ECS tasks are currently using to interact with AWS services. This role is specified in the ECS task definition under the "taskRoleArn" field.

2. **Edit the Role:** Go to the IAM section of the AWS Management Console, locate the role by its name, and open its configuration.

3. **Attach Policies or Add Inline Policy:**

There are two ways to grant access to the Parameter store:

- Attach AWS Managed Policies: If the role doesn't already have the following policies, attach it:

    - AmazonSSMReadOnlyAccess

- **Add Inline Policy for Granular Access:** For tighter security, you might opt to create an inline policy that specifies exactly which resources the tasks can access and what actions they can perform on those resources. This is particularly important for accessing specific resources like the Parameter Store parameters used by the SigNoz sidecar. The JSON for the inline policy will be:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "ssm:GetParameter"
            ],
            "Resource": [
                "arn:aws:ssm:<aws-region>:<aws-account-id>:parameter/ecs/signoz/otelcol-sidecar.yaml"
            ],
            "Effect": "Allow"
        }
    ]
}
```

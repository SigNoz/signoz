## Deploy the task definition

If your application runs as an ECS service, you update the service to use the new revision of your task definition. This tells ECS to start new tasks based on this updated definition and gracefully replace the old tasks with the new ones, ensuring minimal disruption to your application.

**NOTE:** Once the task is running, you should be able to see SigNoz sidecar container logs in CloudWatch Logs because we have set the logDriver parameter to be `awslogs` in our task definition.


## Verify data in SigNoz

To verify that your sidecar container is running, go to the Dashboard section of SigNoz Cloud and import the dashboard **ECS - Container Metrics** Dashboard from [here](https://raw.githubusercontent.com/SigNoz/dashboards/main/ecs-infra-metrics/container-metrics.json).
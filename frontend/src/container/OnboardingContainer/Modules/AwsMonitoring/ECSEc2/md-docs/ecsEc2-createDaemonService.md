## Create Daemon Service

Using the template we downloaded and the SigNoz OpenTelemetry Collector configuration we created, we will create the Daemon Service. This can be done following these steps:

### Step 1: Set the environment variable

Set the environment variable by running the below command uisng your AWS CLI:

```bash
export CLUSTER_NAME=<YOUR-ECS-CLUSTER-NAME>
export REGION=<YOUR-ECS-REGION>
export COMMAND=--config=env:SIGNOZ_CONFIG_CONTENT
export SIGNOZ_CONFIG_PATH=/ecs/signoz/otelcol-daemon.yaml
```

`<YOUR-ECS-CLUSTER-NAME>` - Name of your ECS cluster. For example, **my-test-cluster** 

`<YOUR-ECS-REGION>` - Region in which your ECS cluster is running. For example, **us-east-1**

&nbsp;

### Step 2: Create stack for Daemon Service

With the environment variables set, you can proceed to create the Daemon service using `cloudformation create-stack` by running the below command using your AWS CLI:

```bash
aws cloudformation create-stack --stack-name AOCECS-daemon-${CLUSTER_NAME}-${REGION} \
    --template-body file://daemon-template.yaml \
    --parameters ParameterKey=ClusterName,ParameterValue=${CLUSTER_NAME} \
    ParameterKey=CreateIAMRoles,ParameterValue=True \
        ParameterKey=command,ParameterValue=${COMMAND} \
        ParameterKey=SigNozConfigPath,ParameterValue=${SIGNOZ_CONFIG_PATH} \
    --capabilities CAPABILITY_NAMED_IAM \
    --region ${REGION}
```

&nbsp;

### Step 3: Verify Daemon Service

To verify that the daemon service is running, you can run the following command, which should output the task ARN of the Daemon service as the output.

```bash
aws ecs list-tasks --cluster ${CLUSTER_NAME} --region ${REGION}

```
&nbsp;

### Step 4: Verify Data in SigNoz

To verify that the data is being sent to SigNoz Cloud, you can go to the dashboard section of SigNoz and import one of the following dashboards below:

- [instancemetrics.json](https://raw.githubusercontent.com/SigNoz/dashboards/chore/ecs-dashboards/ecs-infra-metrics/instance-metrics.json)
- [hostmetrics.json](https://raw.githubusercontent.com/SigNoz/dashboards/main/hostmetrics/hostmetrics.json)

&nbsp;

### Optional Step: Clean Up

In a cloud environment where resources are billed based on usage, cleaning up resources is crucial. This step involves removing the daemon service and any associated resources that were created during the setup process to collect and forward metrics and logs from your ECS infrastructure to SigNoz. To clean up the daemon service, you can run the following command:

```bash
aws cloudformation delete-stack --stack-name AOCECS-daemon-${CLUSTER_NAME}-${REGION} --region ${REGION}
```

&nbsp;

Once you follow these steps, you should be able to see your logs and metrics data coming in SigNoz Cloud. To see data for your traces, click on Continue to next step below.
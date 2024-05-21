These steps will help you to collect **metrics, logs and traces** from your ECS infrastructure. 

## Create SigNoz OTel Collector Configuration file 

To setup the SigNoz OTel Collector config, follow these two steps:

### Step 1: 
Navigate to the AWS Parameter store and create a new parameter named **/ecs/signoz/otelcol-sidecar.yaml**

### Step 2:
Download the otelcol-sidecar YAML configuration file:
```bash
wget https://github.com/SigNoz/benchmark/raw/main/ecs/otelcol-sidecar.yaml
```
&nbsp;

Update `{region}` and `SIGNOZ_INGESTION_KEY` values in your YAML configuration file with your SigNoz cloud values mentioned below:

{region} : `{{REGION}}`

SIGNOZ_INGESTION_KEY : `{{SIGNOZ_INGESTION_KEY}}`

&nbsp;

Once you update these values, copy the updated content of the `otelcol-sidecar.yaml` file and paste it in the value field of the **/ecs/signoz/otelcol-sidecar.yaml** parameter that you created in Step 1.

&nbsp;

**NOTE:**
- After successful set up, feel free to remove `logging` exporter if it gets too noisy. To do so, simply remove the logging exporter from the **exporters** list in the following pipelines: `traces`, `metrics`, `metrics/aws` and `logs` from the `otelcol-sidecar.yaml` file.
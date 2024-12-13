
You can stream logs from Vercel to SigNoz using [log drains](https://vercel.com/docs/observability/log-drains-overview/log-drains#configure-a-log-drain).

**Note:** Log Drains are only supported in **Vercel Pro** and **Enterprise accounts**.

&nbsp;

### Step 1: Select Sources

* From the Vercel dashboard, go to **Team Settings > Log Drains**.

&nbsp;

* Select sources from which you want to collect logs (Example -> Statci, External, Lambda etc.)

&nbsp;

* Choose delivery format as `JSON`

&nbsp;

* Specify your target projects

&nbsp;


### Step 2: Add Log Drain

* Enter the endpoint URL as follows:
```bash
https://ingest.{{REGION}}.signoz.cloud:443/logs/json
```
&nbsp;

* Enable **Custom Headers** and add the headers `signoz-ingestion-key` and `x-vercel-verify`
```bash
signoz-ingestion-key: {{SIGNOZ_INGESTION_KEY}}
```
```bash
x-vercel-verify: <YOUR_VERCEL_VERIFY_TOKEN>
```
**Note:** The value of `x-vercel-verify` will be visible on your screen in the endpoint section.

&nbsp;

* Click on **Verify** button and then **Add Log Drain** button in Vercel.

&nbsp;

Click on the **Done** button below and you should be able to see your logs in SigNoz.
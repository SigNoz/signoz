&nbsp;

Once you are done intrumenting your JavaScript application, you can run it using the below commands
&nbsp;

### Step 1: Run OTel Collector
 Run this command inside the `otelcol-contrib` directory that you created in the install Otel Collector step

```bash
./otelcol-contrib --config ./config.yaml &> otelcol-output.log & echo "$!" > otel-pid
```
&nbsp;

#### (Optional Step): View last 50 lines of `otelcol` logs
```bash
tail -f -n 50 otelcol-output.log
```
&nbsp;

#### (Optional Step): Stop `otelcol`
```bash
kill "$(< otel-pid)"
```
&nbsp;

### Step 2: Run your application
Run your JavaScript application as you normally would.

For example:

If you're using `npm`
```bash
npm start
```
&nbsp;

If you're using `yarn`
```bash
yarn start
``` 

&nbsp;

To view more detailed documentation, checkout this [link](https://signoz.io/docs/instrumentation/javascript/)
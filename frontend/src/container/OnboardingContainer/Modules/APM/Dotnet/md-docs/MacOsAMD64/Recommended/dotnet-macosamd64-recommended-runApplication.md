&nbsp;
Once you are done intrumenting your .NET application, you can run it using the below commands
&nbsp;

### Step 1: Run OTel Collector
 Run this command inside the `otelcol-contrib` directory that you created in the install Otel Collector step

```bash
./otelcol-contrib --config ./config.yaml
```

&nbsp;

### Step 2: Run your .NET application
```bash
dotnet build
dotnet run
```
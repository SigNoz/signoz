
**Step 6: Set environment variables and run app**

Run application using your run command or the following generalized command (depending on framework you are using):

```
    php -S localhost:8080 app.php
```

You can change the env vars value by referencing values from the following lookup table

| Environment Variable                  | Value                                        |
|-------------------------------|----------------------------------------------|
| OTEL_SERVICE_NAME              | `<SERVICE_NAME>` replace it with name of your app                         |
| OTEL_EXPORTER_OTLP_ENDPOINT    | `<COLLECTOR_ENDPOINT>` replace this with the Otel Collector Endpoint. If you have hosted it somewhere, provide the URL. Otherwise, the default is `http://localhost:4317`, if you have followed our guide.                       |
| php -S localhost:8080 app.php             | you can replace this with the run command of your PHP application                        |

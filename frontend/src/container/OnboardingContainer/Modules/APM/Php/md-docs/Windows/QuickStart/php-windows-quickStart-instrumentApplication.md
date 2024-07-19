&nbsp;

**Step 1: Setup Development Environment**

Initialize the application using

```
composer init --no-interaction --stability beta --require slim/slim:"^4" --require slim/psr7:"^1"
```

After successful run of prior command a file named `composer.json` will be generated if it does not exist. Next run the following command, make sure the version of `php` you are using is `7.4` or else you might encounter some issues running the following command.

```
composer update
```

**Step 2: Build the extension**

With our environment set up we can install the extension using [PECL](https://pecl.php.net/):

```bash
pecl install opentelemetry
```

If gRPC is already downloaded and installed, skip the following step.

```bash
pecl install grpc 
```

After successfully installing the OpenTelemetry extension, add the extension to `php.ini` file of your project:

```php
[opentelemetry]
extension=opentelemetry.so
```

Verify that the extension is enabled by running:

```
php -m | grep opentelemetry
```

This should output:

```
opentelemetry
```

**Step 3: Add the dependencies**

Add dependencies required for OpenTelemetry SDK for PHP to perform automatic instrumentation using this command :

```
composer config allow-plugins.php-http/discovery false
```

```
composer require open-telemetry/sdk open-telemetry/exporter-otlp php-http/guzzle7-adapter open-telemetry/transport-grpc guzzlehttp/guzzle
```

You can install the additional dependencies provided by OpenTelemetry for different PHP frameworks from [here](https://packagist.org/explore/?query=open-telemetry).


**Step 4: Modify php code**

```
<?php

use OpenTelemetry\API\Common\Instrumentation\Globals;
use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Common\Export\Stream\StreamTransportFactory;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Sdk;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
use OpenTelemetry\SDK\Trace\Sampler\ParentBased;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessorBuilder;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SemConv\ResourceAttributes;
use OpenTelemetry\Contrib\Grpc\GrpcTransportFactory;
use OpenTelemetry\Contrib\Otlp\OtlpUtil;
use OpenTelemetry\API\Common\Signal\Signals;

function initOpenTelemetry()
{ 
 $resource = ResourceInfoFactory::emptyResource()->merge(ResourceInfo::create(Attributes::create([
 ResourceAttributes::SERVICE_NAME => '<SERVICE_NAME>'
 ])));


 $headers = [
 'signoz-access-token' => "<INGESTION_KEY>",
 ];
 $transport = (new GrpcTransportFactory())->create('<SIGNOZ_ENDPOINT>' . OtlpUtil::method(Signals::TRACE), 'application/x-protobuf', $headers);
 $spanExporter = new SpanExporter($transport);


 $tracerProvider = TracerProvider::builder()
 ->addSpanProcessor(
 (new BatchSpanProcessorBuilder($spanExporter))->build()
 )
 ->setResource($resource)
 ->setSampler(new ParentBased(new AlwaysOnSampler()))
 ->build();

 Sdk::builder()
 ->setTracerProvider($tracerProvider)
 ->setPropagator(TraceContextPropagator::getInstance())
 ->setAutoShutdown(true)
 ->buildAndRegisterGlobal();

}
?>
```

You can change the env vars value by referencing values from the following lookup table

| Environment Variable                  | Value                                        |
|-------------------------------|----------------------------------------------|
| OTEL_SERVICE_NAME              | `<SERVICE_NAME>` replace it with name of your app                         |
| OTEL_EXPORTER_OTLP_ENDPOINT    | `<SIGNOZ_ENDPOINT>` replace this with SigNoz cloud endpoint                       |
| OTEL_EXPORTER_OTLP_HEADERS     | signoz-access-token=`<INGESTION_KEY>` replace this with the ingestion key which you must have received in mail        |
| php -S localhost:8080 app.php             | you can replace this with the run command of your PHP application                        |

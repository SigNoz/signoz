&nbsp;

**Step 1: Setup Development Environment**

Initialize the application using

```bash
composer init --no-interaction --stability beta --require slim/slim:"^4" --require slim/psr7:"^1"
```

After successful run of prior command a file named `composer.json` will be generated if it does not exist. Next run the following command, make sure the version of `php` you are using is `7.4` or else you might encounter some issues running the following command.

```bash
composer update
```

&nbsp;

**Step 2: Build the extension**

With our environment set up we can install the extension using [PECL](https://pecl.php.net/):

```bash
pecl install opentelemetry
```
&nbsp;

If gRPC is already downloaded and installed, skip the following step.

```bash
pecl install grpc 
```
&nbsp;

After successfully installing the OpenTelemetry extension, add the extension to `php.ini` file of your project:

```bash
[opentelemetry]
extension=opentelemetry.so
```
&nbsp;

Verify that the extension is enabled by running:

```bash
php -m | grep opentelemetry
```
&nbsp;

This should output:

```bash
opentelemetry
```
&nbsp;

**Step 3: Add the dependencies**

Add dependencies required for OpenTelemetry SDK for PHP to perform automatic instrumentation using this command :

```bash
composer config allow-plugins.php-http/discovery false
```
&nbsp;

```
composer require open-telemetry/sdk open-telemetry/exporter-otlp php-http/guzzle7-adapter open-telemetry/transport-grpc guzzlehttp/guzzle
```
&nbsp;

You can install the additional dependencies provided by OpenTelemetry for different PHP frameworks from [here](https://packagist.org/explore/?query=open-telemetry).
&nbsp;

**Step 4: Modify php code**

```bash
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
 ResourceAttributes::SERVICE_NAME => '{{MYAPP}}'
 ])));


 $headers = [
 'signoz-ingestion-key' => "{{SIGNOZ_INGESTION_KEY}}",
 ];
 $transport = (new GrpcTransportFactory())->create('https://ingest.{{REGION}}.signoz.cloud:443/v1/traces"' . OtlpUtil::method(Signals::TRACE), 'application/x-protobuf', $headers);
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

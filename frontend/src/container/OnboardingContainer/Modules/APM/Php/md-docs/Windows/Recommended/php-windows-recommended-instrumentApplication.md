**Step 2: Setup Development Environment**

To configure our PHP application to send data, you need to use OpenTelemetry PHP extension. Since the extension is built from the source, you need to have the build tools, which can be installed using the following command:

**Step 3: Build the extension**

With our environment set up we can install the extension using [PECL](https://pecl.php.net/):

```bash
pecl install opentelemetry
```

If gRPC is already downloaded and installed, skip the following step.

```bash
pecl install grpc 
```

After successfully installing the OpenTelemetry extension, add the extension to `php.ini` file of your project:

```bash
[opentelemetry]
extension=opentelemetry.so
```

Verify that the extension is enabled by running:

```bash
php -m | grep opentelemetry
```

This should output:

```bash
opentelemetry
```

**Step 4: Add the dependencies**

Add dependencies required for OpenTelemetry SDK for PHP to perform automatic instrumentation using this command :

```bash
composer config allow-plugins.php-http/discovery false
```

&nbsp;

```bash
composer require  open-telemetry/sdk  open-telemetry/exporter-otlp php-http/guzzle7-adapter open-telemetry/transport-grpc guzzlehttp/guzzle
```

&nbsp;

You can install the additional dependencies provided by OpenTelemetry for different PHP frameworks from [here](https://packagist.org/explore/?query=open-telemetry).


**Step 5: Modify php code**

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
 ResourceAttributes::SERVICE_NAME => '<SERVICE_NAME>'
 ])));


 $headers = [];
 $transport = (new GrpcTransportFactory())->create('<COLLECTOR_ENDPOINT>' . OtlpUtil::method(Signals::TRACE), 'application/x-protobuf', $headers);
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

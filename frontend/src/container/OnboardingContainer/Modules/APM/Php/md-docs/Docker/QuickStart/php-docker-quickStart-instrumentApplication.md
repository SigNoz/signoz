&nbsp;

### Step 1: Setup Development Environment
Add these crates just below the `[dependencies]` section of your `cargo.toml` file

To configure our PHP application to send data, you need to use OpenTelemetry PHP extension. Since the extension is built from the source, you need to have the build tools, which can be installed using the following command:

**Linux**:
```bash
sudo apt-get install gcc make autoconf
```

**MacOs(Homebrew)**:
```bash
brew install gcc make autoconf
```

&nbsp;

### Step 2: Build the extension

With our environment set up we can install the extension using [PECL](https://pecl.php.net/):

```bash
pecl install opentelemetry
```

After successfully installing the OpenTelemetry extension, add the extension to php.ini file of your project:

```bash
[opentelemetry]
extension=opentelemetry.so
```

Verify that the extension is enabled by running:

```bash
php -m | grep opentelemetry
```

Running the above command will **output**:

```bash
opentelemetry
```

&nbsp;

### Step 3: Add the dependencies

Add dependencies required to perform automatic instrumentation using this command :

```bash
composer config allow-plugins.php-http/discovery false
composer require \
  open-telemetry/sdk \
  open-telemetry/exporter-otlp \
  php-http/guzzle7-adapter \
  open-telemetry/transport-grpc
```

&nbsp;

### Step 4: Dockerize your application

Update your dockerfile to include the environment variables:

```bash
...
# Set environment variables
ENV OTEL_PHP_AUTOLOAD_ENABLED=true \
    OTEL_SERVICE_NAME={{MYAPP}} \
    OTEL_TRACES_EXPORTER=otlp \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.{{REGION}}.signoz.cloud:443 \
    OTEL_EXPORTER_OTLP_HEADERS=signoz-ingestion-key={{SIGNOZ_INGESTION_KEY}} \
    OTEL_PROPAGATORS=baggage,tracecontext
...
```
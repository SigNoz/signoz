&nbsp;

After setting up the Otel collector agent, follow the steps below to instrument your PHP Application

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

# Tiny Node.js Microservices with OpenTelemetry

A minimal demo application with 3 microservices that send OpenTelemetry traces, metrics, and logs to `localhost:4318`.

## Architecture

- **api-gateway** (port 3000) - Entry point that calls service-a
- **service-a** (port 3001) - Calls service-b
- **service-b** (port 3002) - Returns data

## Prerequisites

- Node.js (v18 or higher)
- npm
- SigNoz OTel Collector running on `localhost:4318`

## Setup

1. Install dependencies:

```bash
cd docs/demo-app
npm install
```

1. Make sure SigNoz OTel Collector is running:

```bash
make devenv-signoz-otel-collector
```

## Running the Services

### Option 1: Run all services at once (recommended)

From the `docs/demo-app` directory, run:

```bash
npm start
```

This will start all three services simultaneously with colored output for each service.

### Option 2: Run all services manually (in separate terminals)

Terminal 1:

```bash
cd docs/demo-app/service-b
node index.js
```

Terminal 2:

```bash
cd docs/demo-app/service-a
node index.js
```

Terminal 3:

```bash
cd docs/demo-app/api-gateway
node index.js
```

### Option 3: Use a process manager

You can use `pm2` or similar tools to run all services:

```bash
npm install -g pm2
pm2 start service-b/index.js --name service-b
pm2 start service-a/index.js --name service-a
pm2 start api-gateway/index.js --name api-gateway
```

## Testing

Send a request to the API gateway:

```bash
curl http://localhost:3000/
```

This will create a trace that flows through:

- api-gateway → service-a → service-b

## Telemetry

All services send telemetry data to `http://localhost:4318`:

- **Traces**: OTLP HTTP endpoint `/v1/traces`
- **Metrics**: OTLP HTTP endpoint `/v1/metrics`
- **Logs**: OTLP HTTP endpoint `/v1/logs`

The telemetry data will be visible in your SigNoz instance after the OTel Collector processes it.

## Debugging

### Quick Debug Check

Run the debug script to check all components:

```bash
./debug.sh
```

This will check:

- OTel Collector health
- Port availability
- Service endpoints
- Network connectivity

### 1. Enable Debug Mode

Run services with debug logging enabled using the debug script:

```bash
npm run start:debug
```

Or manually set the environment variable:

```bash
OTEL_DEBUG=true npm start
```

This will:

- **Enable Console Span Exporter** - Prints all spans to console in real-time
- **Enable OTLP Exporter Debugging** - Logs export attempts and errors
- Print initialization messages showing:
  - Service name
  - Exporter endpoints (traces, metrics, logs)
  - SDK startup confirmation
  - Export success/failure messages

**Note**: Debug logs are printed to `stderr` (using `console.error`) so they appear even if stdout is redirected.

**Console Exporter**: When debug mode is enabled, spans are printed to the console immediately. This helps verify that spans are being generated correctly. The OTLP exporter uses batching (1 second delay) so you may see console output before OTLP exports.

### 2. Check OTel Collector Logs

Check if the collector is receiving data:

```bash
docker logs signoz-otel-collector
```

Or if using the local setup:

```bash
make devenv-signoz-otel-collector
```

Look for log entries showing received traces, metrics, or logs.

### 3. Test OTel Collector Endpoint

Verify the collector is listening:

```bash
curl http://localhost:13133
```

Check health status:

```bash
curl http://localhost:13133/healthz
```

### 4. Test with Manual Trace

Send a test trace directly to verify the endpoint:

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "test-service"}
        }]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "12345678901234567890123456789012",
          "spanId": "1234567890123456",
          "name": "test-span",
          "startTimeUnixNano": "'$(date +%s)000000000'",
          "endTimeUnixNano": "'$(($(date +%s) + 1))000000000'"
        }]
      }]
    }]
  }'
```

### 5. Monitor Network Traffic

Use `tcpdump` or `wireshark` to monitor traffic to port 4318:

```bash
sudo tcpdump -i lo -A -s 0 'tcp port 4318'
```

Or use `netstat` to check connections:

```bash
netstat -an | grep 4318
```

### 6. Check SigNoz UI

1. Open SigNoz frontend (usually `http://localhost:3301`)
2. Navigate to **Services** to see if your services appear
3. Check **Traces** tab for incoming traces
4. Check **Metrics** tab for metrics
5. Check **Logs** tab for logs

### 7. Common Issues

**Issue**: No data appearing in SigNoz

- Verify OTel Collector is running: `curl http://localhost:13133`
- Check collector logs for errors
- Verify services are sending to correct endpoint (`localhost:4318`)
- Ensure services are generating traffic (make HTTP requests)

**Issue**: Connection refused errors

- Check if collector is listening on port 4318: `netstat -an | grep 4318`
- Verify firewall isn't blocking the port
- Check if another service is using port 4318

**Issue**: Console exporter works but OTLP doesn't send data

This is a common issue. Possible causes:

1. **Batch Processor Delay**: OTLP uses `BatchSpanProcessor` which batches spans and sends them every 1 second. Console exporter uses `SimpleSpanProcessor` which sends immediately. Wait a few seconds after generating traffic.

2. **Collector Not Running**: Verify collector is running:

   ```bash
   curl http://localhost:13133/healthz
   ```

3. **Connection Errors**: Enable debug mode to see export errors:

   ```bash
   npm run start:debug
   ```

   Look for "OTLP Trace Exporter Error" messages.

4. **Network Issues**: Test the endpoint manually:

   ```bash
   curl -X POST http://localhost:4318/v1/traces -H "Content-Type: application/json" -d '{"resourceSpans":[]}'
   ```

5. **Check Collector Logs**: Look for errors in collector logs:

   ```bash
   docker logs signoz-otel-collector | grep -i error
   ```

**Issue**: Services not starting

- Check Node.js version: `node --version` (should be v18+)
- Verify dependencies are installed: `npm install`
- Check for port conflicts (3000, 3001, 3002)

### 8. Enable Verbose Logging in OTel Collector

Edit `.devenv/docker/signoz-otel-collector/otel-collector-config.yaml` and add debug exporter:

```yaml
exporters:
  debug:
    verbosity: detailed
```

Then add it to your pipelines temporarily to see all received data.

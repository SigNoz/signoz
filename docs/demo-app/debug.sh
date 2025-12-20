#!/bin/bash

echo "=== OpenTelemetry Debugging Script ==="
echo ""

echo "1. Checking OTel Collector health..."
curl -s http://localhost:13133/healthz && echo " ✓ Collector is healthy" || echo " ✗ Collector is not responding"

echo ""
echo "2. Checking if port 4318 is listening..."
netstat -an 2>/dev/null | grep 4318 && echo " ✓ Port 4318 is listening" || echo " ✗ Port 4318 is not listening"

echo ""
echo "3. Testing trace endpoint..."
curl -s -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}' > /dev/null && echo " ✓ Trace endpoint is accessible" || echo " ✗ Trace endpoint is not accessible"

echo ""
echo "4. Checking service ports..."
for port in 3000 3001 3002; do
  netstat -an 2>/dev/null | grep ":$port " > /dev/null && echo " ✓ Port $port is in use" || echo " ✗ Port $port is not in use"
done

echo ""
echo "5. Testing service endpoints..."
curl -s http://localhost:3000/ > /dev/null && echo " ✓ API Gateway is responding" || echo " ✗ API Gateway is not responding"
curl -s http://localhost:3001/process > /dev/null && echo " ✓ Service A is responding" || echo " ✗ Service A is not responding"
curl -s http://localhost:3002/data > /dev/null && echo " ✓ Service B is responding" || echo " ✗ Service B is not responding"

echo ""
echo "=== Debug check complete ==="


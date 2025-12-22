require('../shared/otel').initializeTelemetry('service-b');

const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const express = require('express');
const app = express();
const PORT = 3002;

const logger = logs.getLogger('service-b');

app.get('/data', (req, res) => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Received request for /data',
    attributes: { endpoint: '/data' },
  });
  res.json({ message: 'Data from service-b', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Service B running on port ${PORT}`);
});


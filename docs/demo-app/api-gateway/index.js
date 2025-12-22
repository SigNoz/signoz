require('../shared/otel').initializeTelemetry('api-gateway');

const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const express = require('express');
const app = express();
const PORT = 3000;

const logger = logs.getLogger('api-gateway');

app.get('/', async (req, res) => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Incoming request to api-gateway',
    attributes: { endpoint: '/' },
  });
  try {
    const response = await fetch('http://localhost:3001/process');
    const data = await response.json();
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: 'Successfully processed request',
      attributes: { endpoint: '/', status: 'success' },
    });
    res.json({ message: 'Response from api-gateway', data });
  } catch (error) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: `Error processing request: ${error.message}`,
      attributes: { endpoint: '/', error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});


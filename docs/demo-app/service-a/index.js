require('../shared/otel').initializeTelemetry('service-a');

const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const express = require('express');
const app = express();
const PORT = 3001;

const logger = logs.getLogger('service-a');

app.get('/process', async (req, res) => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Processing request from api-gateway',
    attributes: { endpoint: '/process' },
  });
  try {
    const response = await fetch('http://localhost:3002/data');
    const data = await response.json();
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: 'Successfully fetched data from service-b',
      attributes: { endpoint: '/process', status: 'success' },
    });
    res.json({ message: 'Processed by service-a', data });
  } catch (error) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: `Error fetching from service-b: ${error.message}`,
      attributes: { endpoint: '/process', error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Service A running on port ${PORT}`);
});


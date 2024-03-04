DROP TABLE IF EXISTS signoz_traces.durationSortMV ON CLUSTER {{.SIGNOZ_CLUSTER}};

ALTER TABLE signoz_traces.signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    DROP INDEX idx_rpcMethod,
    DROP INDEX idx_responseStatusCode;

ALTER TABLE signoz_traces.durationSort ON CLUSTER {{.SIGNOZ_CLUSTER}}
    DROP INDEX idx_rpcMethod,
    DROP INDEX idx_responseStatusCode;




CREATE MATERIALIZED VIEW IF NOT EXISTS signoz_traces.durationSortMV ON CLUSTER {{.SIGNOZ_CLUSTER}}
TO signoz_traces.durationSort
AS SELECT
  timestamp,
  traceID,
  spanID,
  parentSpanID,
  serviceName,
  name,
  kind,
  durationNano,
  statusCode,
  component,
  httpMethod,
  httpUrl,
  httpCode,
  httpRoute,
  httpHost,
  gRPCMethod,
  gRPCCode,
  hasError,
  tagMap
FROM signoz_traces.signoz_index_v2
ORDER BY durationNano, timestamp;

ATTACH TABLE IF NOT EXISTS signoz_traces.durationSortMV ON CLUSTER {{.SIGNOZ_CLUSTER}};
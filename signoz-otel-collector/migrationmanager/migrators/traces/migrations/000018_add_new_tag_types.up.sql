DROP TABLE IF EXISTS signoz_traces.durationSortMV ON CLUSTER {{.SIGNOZ_CLUSTER}};

ALTER TABLE signoz_traces.signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} 
ADD COLUMN IF NOT EXISTS stringTagMap Map(String, String) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS numberTagMap Map(String, Float64) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS boolTagMap Map(String, bool) CODEC(ZSTD(1));

ALTER TABLE signoz_traces.distributed_signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} 
ADD COLUMN IF NOT EXISTS stringTagMap Map(String, String) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS numberTagMap Map(String, Float64) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS boolTagMap Map(String, bool) CODEC(ZSTD(1));

ALTER TABLE signoz_traces.durationSort ON CLUSTER {{.SIGNOZ_CLUSTER}} 
ADD COLUMN IF NOT EXISTS stringTagMap Map(String, String) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS numberTagMap Map(String, Float64) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS boolTagMap Map(String, bool) CODEC(ZSTD(1));

ALTER TABLE signoz_traces.distributed_durationSort ON CLUSTER {{.SIGNOZ_CLUSTER}}
ADD COLUMN IF NOT EXISTS stringTagMap Map(String, String) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS numberTagMap Map(String, Float64) CODEC(ZSTD(1)),
ADD COLUMN IF NOT EXISTS boolTagMap Map(String, bool) CODEC(ZSTD(1));

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
  tagMap,
  rpcSystem,
  rpcService,
  rpcMethod,
  responseStatusCode,
  stringTagMap,
  numberTagMap,
  boolTagMap
FROM signoz_traces.signoz_index_v2
ORDER BY durationNano, timestamp;
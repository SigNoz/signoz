package telemetryspans

import (
	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
)

// 1. │ CREATE TABLE signoz_traces.signoz_index_v3                                                                                                                 ↴│
//    │↳(                                                                                                                                                          ↴│
//    │↳    `ts_bucket_start` UInt64 CODEC(DoubleDelta, LZ4),                                                                                                      ↴│
//    │↳    `resource_fingerprint` String CODEC(ZSTD(1)),                                                                                                          ↴│
//    │↳    `timestamp` DateTime64(9) CODEC(DoubleDelta, LZ4),                                                                                                     ↴│
//    │↳    `trace_id` FixedString(32) CODEC(ZSTD(1)),                                                                                                             ↴│
//    │↳    `span_id` String CODEC(ZSTD(1)),                                                                                                                       ↴│
//    │↳    `trace_state` String CODEC(ZSTD(1)),                                                                                                                   ↴│
//    │↳    `parent_span_id` String CODEC(ZSTD(1)),                                                                                                                ↴│
//    │↳    `flags` UInt32 CODEC(T64, ZSTD(1)),                                                                                                                    ↴│
//    │↳    `name` LowCardinality(String) CODEC(ZSTD(1)),                                                                                                          ↴│
//    │↳    `kind` Int8 CODEC(T64, ZSTD(1)),                                                                                                                       ↴│
//    │↳    `kind_string` String CODEC(ZSTD(1)),                                                                                                                   ↴│
//    │↳    `duration_nano` UInt64 CODEC(T64, ZSTD(1)),                                                                                                            ↴│
//    │↳    `status_code` Int16 CODEC(T64, ZSTD(1)),                                                                                                               ↴│
//    │↳    `status_message` String CODEC(ZSTD(1)),                                                                                                                ↴│
//    │↳    `status_code_string` String CODEC(ZSTD(1)),                                                                                                            ↴│
//    │↳    `attributes_string` Map(LowCardinality(String), String) CODEC(ZSTD(1)),                                                                                ↴│
//    │↳    `attributes_number` Map(LowCardinality(String), Float64) CODEC(ZSTD(1)),                                                                               ↴│
//    │↳    `attributes_bool` Map(LowCardinality(String), Bool) CODEC(ZSTD(1)),                                                                                    ↴│
//    │↳    `resources_string` Map(LowCardinality(String), String) CODEC(ZSTD(1)),                                                                                 ↴│
//    │↳    `events` Array(String) CODEC(ZSTD(2)),                                                                                                                 ↴│
//    │↳    `links` String CODEC(ZSTD(1)),                                                                                                                         ↴│
//    │↳    `response_status_code` LowCardinality(String) CODEC(ZSTD(1)),                                                                                          ↴│
//    │↳    `external_http_url` LowCardinality(String) CODEC(ZSTD(1)),                                                                                             ↴│
//    │↳    `http_url` LowCardinality(String) CODEC(ZSTD(1)),                                                                                                      ↴│
//    │↳    `external_http_method` LowCardinality(String) CODEC(ZSTD(1)),                                                                                          ↴│
//    │↳    `http_method` LowCardinality(String) CODEC(ZSTD(1)),                                                                                                   ↴│
//    │↳    `http_host` LowCardinality(String) CODEC(ZSTD(1)),                                                                                                     ↴│
//    │↳    `db_name` LowCardinality(String) CODEC(ZSTD(1)),                                                                                                       ↴│
//    │↳    `db_operation` LowCardinality(String) CODEC(ZSTD(1)),                                                                                                  ↴│
//    │↳    `has_error` Bool CODEC(T64, ZSTD(1)),                                                                                                                  ↴│
//    │↳    `is_remote` LowCardinality(String) CODEC(ZSTD(1)),                                                                                                     ↴│
//    │↳    `resource_string_service$$name` LowCardinality(String) DEFAULT resources_string['service.name'] CODEC(ZSTD(1)),                                        ↴│
//    │↳    `attribute_string_http$$route` LowCardinality(String) DEFAULT attributes_string['http.route'] CODEC(ZSTD(1)),                                          ↴│
//    │↳    `attribute_string_messaging$$system` LowCardinality(String) DEFAULT attributes_string['messaging.system'] CODEC(ZSTD(1)),                              ↴│
//    │↳    `attribute_string_messaging$$operation` LowCardinality(String) DEFAULT attributes_string['messaging.operation'] CODEC(ZSTD(1)),                        ↴│
//    │↳    `attribute_string_db$$system` LowCardinality(String) DEFAULT attributes_string['db.system'] CODEC(ZSTD(1)),                                            ↴│
//    │↳    `attribute_string_rpc$$system` LowCardinality(String) DEFAULT attributes_string['rpc.system'] CODEC(ZSTD(1)),                                          ↴│
//    │↳    `attribute_string_rpc$$service` LowCardinality(String) DEFAULT attributes_string['rpc.service'] CODEC(ZSTD(1)),                                        ↴│
//    │↳    `attribute_string_rpc$$method` LowCardinality(String) DEFAULT attributes_string['rpc.method'] CODEC(ZSTD(1)),                                          ↴│
//    │↳    `attribute_string_peer$$service` LowCardinality(String) DEFAULT attributes_string['peer.service'] CODEC(ZSTD(1)),                                      ↴│
//    │↳    `traceID` FixedString(32) ALIAS trace_id,                                                                                                              ↴│
//    │↳    `spanID` String ALIAS span_id,                                                                                                                         ↴│
//    │↳    `parentSpanID` String ALIAS parent_span_id,                                                                                                            ↴│
//    │↳    `spanKind` String ALIAS kind_string,                                                                                                                   ↴│
//    │↳    `durationNano` UInt64 ALIAS duration_nano,                                                                                                             ↴│
//    │↳    `statusCode` Int16 ALIAS status_code,                                                                                                                  ↴│
//    │↳    `statusMessage` String ALIAS status_message,                                                                                                           ↴│
//    │↳    `statusCodeString` String ALIAS status_code_string,                                                                                                    ↴│
//    │↳    `references` String ALIAS links,                                                                                                                       ↴│
//    │↳    `responseStatusCode` LowCardinality(String) ALIAS response_status_code,                                                                                ↴│
//    │↳    `externalHttpUrl` LowCardinality(String) ALIAS external_http_url,                                                                                      ↴│
//    │↳    `httpUrl` LowCardinality(String) ALIAS http_url,                                                                                                       ↴│
//    │↳    `externalHttpMethod` LowCardinality(String) ALIAS external_http_method,                                                                                ↴│
//    │↳    `httpMethod` LowCardinality(String) ALIAS http_method,                                                                                                 ↴│
//    │↳    `httpHost` LowCardinality(String) ALIAS http_host,                                                                                                     ↴│
//    │↳    `dbName` LowCardinality(String) ALIAS db_name,                                                                                                         ↴│
//    │↳    `dbOperation` LowCardinality(String) ALIAS db_operation,                                                                                               ↴│
//    │↳    `hasError` Bool ALIAS has_error,                                                                                                                       ↴│
//    │↳    `isRemote` LowCardinality(String) ALIAS is_remote,                                                                                                     ↴│
//    │↳    `serviceName` LowCardinality(String) ALIAS `resource_string_service$$name`,                                                                            ↴│
//    │↳    `httpRoute` LowCardinality(String) ALIAS `attribute_string_http$$route`,                                                                               ↴│
//    │↳    `msgSystem` LowCardinality(String) ALIAS `attribute_string_messaging$$system`,                                                                         ↴│
//    │↳    `msgOperation` LowCardinality(String) ALIAS `attribute_string_messaging$$operation`,                                                                   ↴│
//    │↳    `dbSystem` LowCardinality(String) ALIAS `attribute_string_db$$system`,                                                                                 ↴│
//    │↳    `rpcSystem` LowCardinality(String) ALIAS `attribute_string_rpc$$system`,                                                                               ↴│
//    │↳    `rpcService` LowCardinality(String) ALIAS `attribute_string_rpc$$service`,                                                                             ↴│
//    │↳    `rpcMethod` LowCardinality(String) ALIAS `attribute_string_rpc$$method`,                                                                               ↴│
//    │↳    `peerService` LowCardinality(String) ALIAS `attribute_string_peer$$service`,                                                                           ↴│
//    │↳    `resource_string_service$$name_exists` Bool DEFAULT if(mapContains(resources_string, 'service.name') != 0, true, false) CODEC(ZSTD(1)),                ↴│
//    │↳    `attribute_string_http$$route_exists` Bool DEFAULT if(mapContains(attributes_string, 'http.route') != 0, true, false) CODEC(ZSTD(1)),                  ↴│
//    │↳    `attribute_string_messaging$$system_exists` Bool DEFAULT if(mapContains(attributes_string, 'messaging.system') != 0, true, false) CODEC(ZSTD(1)),      ↴│
//    │↳    `attribute_string_messaging$$operation_exists` Bool DEFAULT if(mapContains(attributes_string, 'messaging.operation') != 0, true, false) CODEC(ZSTD(1)),↴│
//    │↳    `attribute_string_db$$system_exists` Bool DEFAULT if(mapContains(attributes_string, 'db.system') != 0, true, false) CODEC(ZSTD(1)),                    ↴│
//    │↳    `attribute_string_rpc$$system_exists` Bool DEFAULT if(mapContains(attributes_string, 'rpc.system') != 0, true, false) CODEC(ZSTD(1)),                  ↴│
//    │↳    `attribute_string_rpc$$service_exists` Bool DEFAULT if(mapContains(attributes_string, 'rpc.service') != 0, true, false) CODEC(ZSTD(1)),                ↴│
//    │↳    `attribute_string_rpc$$method_exists` Bool DEFAULT if(mapContains(attributes_string, 'rpc.method') != 0, true, false) CODEC(ZSTD(1)),                  ↴│
//    │↳    `attribute_string_peer$$service_exists` Bool DEFAULT if(mapContains(attributes_string, 'peer.service') != 0, true, false) CODEC(ZSTD(1)),              ↴│
//    │↳    INDEX idx_trace_id trace_id TYPE tokenbf_v1(10000, 5, 0) GRANULARITY 1,                                                                                ↴│
//    │↳    INDEX idx_span_id span_id TYPE tokenbf_v1(5000, 5, 0) GRANULARITY 1,                                                                                   ↴│
//    │↳    INDEX idx_duration duration_nano TYPE minmax GRANULARITY 1,                                                                                            ↴│
//    │↳    INDEX idx_name name TYPE ngrambf_v1(4, 5000, 2, 0) GRANULARITY 1,                                                                                      ↴│
//    │↳    INDEX idx_kind kind TYPE minmax GRANULARITY 4,                                                                                                         ↴│
//    │↳    INDEX idx_http_route `attribute_string_http$$route` TYPE bloom_filter GRANULARITY 4,                                                                   ↴│
//    │↳    INDEX idx_http_url http_url TYPE bloom_filter GRANULARITY 4,                                                                                           ↴│
//    │↳    INDEX idx_http_host http_host TYPE bloom_filter GRANULARITY 4,                                                                                         ↴│
//    │↳    INDEX idx_http_method http_method TYPE bloom_filter GRANULARITY 4,                                                                                     ↴│
//    │↳    INDEX idx_timestamp timestamp TYPE minmax GRANULARITY 1,                                                                                               ↴│
//    │↳    INDEX idx_rpc_method `attribute_string_rpc$$method` TYPE bloom_filter GRANULARITY 4,                                                                   ↴│
//    │↳    INDEX idx_response_statusCode response_status_code TYPE set(0) GRANULARITY 1,                                                                          ↴│
//    │↳    INDEX idx_status_code_string status_code_string TYPE set(3) GRANULARITY 4,                                                                             ↴│
//    │↳    INDEX idx_kind_string kind_string TYPE set(5) GRANULARITY 4,                                                                                           ↴│
//    │↳    INDEX attributes_string_idx_key mapKeys(attributes_string) TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 1,                                                  ↴│
//    │↳    INDEX attributes_string_idx_val mapValues(attributes_string) TYPE ngrambf_v1(4, 5000, 2, 0) GRANULARITY 1,                                             ↴│
//    │↳    INDEX attributes_number_idx_key mapKeys(attributes_number) TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 1,                                                  ↴│
//    │↳    INDEX attributes_number_idx_val mapValues(attributes_number) TYPE bloom_filter GRANULARITY 1,                                                          ↴│
//    │↳    INDEX attributes_bool_idx_key mapKeys(attributes_bool) TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 1,                                                      ↴│
//    │↳    INDEX resources_string_idx_key mapKeys(resources_string) TYPE tokenbf_v1(1024, 2, 0) GRANULARITY 1,                                                    ↴│
//    │↳    INDEX resources_string_idx_val mapValues(resources_string) TYPE ngrambf_v1(4, 5000, 2, 0) GRANULARITY 1                                                ↴│
//    │↳)                                                                                                                                                          ↴│
//    │↳ENGINE = MergeTree                                                                                                                                         ↴│
//    │↳PARTITION BY toDate(timestamp)                                                                                                                             ↴│
//    │↳ORDER BY (ts_bucket_start, resource_fingerprint, has_error, name, timestamp)                                                                               ↴│
//    │↳TTL toDateTime(timestamp) + toIntervalSecond(1296000)                                                                                                      ↴│
//    │↳SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1                                                                                                  │
//    └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

var mainColumns = map[string]schema.Column{
	"ts_bucket_start":      {Name: "ts_bucket_start", Type: schema.ColumnTypeUInt64},
	"resource_fingerprint": {Name: "resource_fingerprint", Type: schema.ColumnTypeString},

	"timestamp":          {Name: "timestamp", Type: schema.ColumnTypeUInt64},
	"trace_id":           {Name: "trace_id", Type: schema.ColumnTypeString},
	"span_id":            {Name: "span_id", Type: schema.ColumnTypeString},
	"trace_state":        {Name: "trace_state", Type: schema.ColumnTypeString},
	"parent_span_id":     {Name: "parent_span_id", Type: schema.ColumnTypeString},
	"flags":              {Name: "flags", Type: schema.ColumnTypeUInt32},
	"name":               {Name: "name", Type: schema.ColumnTypeString},
	"kind":               {Name: "kind", Type: schema.ColumnTypeInt8},
	"kind_string":        {Name: "kind_string", Type: schema.ColumnTypeString},
	"duration_nano":      {Name: "duration_nano", Type: schema.ColumnTypeUInt64},
	"status_code":        {Name: "status_code", Type: schema.ColumnTypeInt16},
	"status_message":     {Name: "status_message", Type: schema.ColumnTypeString},
	"status_code_string": {Name: "status_code_string", Type: schema.ColumnTypeString},

	"attributes_string": {Name: "attributes_string", Type: schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}},
	"attributes_number": {Name: "attributes_number", Type: schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeFloat64,
	}},
	"attributes_bool": {Name: "attributes_bool", Type: schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeUInt8,
	}},
	"resources_string": {Name: "resources_string", Type: schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}},
	"events": {Name: "events", Type: schema.ColumnTypeArray{
		ElementType: schema.ColumnTypeString,
	}},
	"links":                                 {Name: "links", Type: schema.ColumnTypeString},
	"response_status_code":                  {Name: "response_status_code", Type: schema.ColumnTypeString},
	"external_http_url":                     {Name: "external_http_url", Type: schema.ColumnTypeString},
	"http_url":                              {Name: "http_url", Type: schema.ColumnTypeString},
	"external_http_method":                  {Name: "external_http_method", Type: schema.ColumnTypeString},
	"http_method":                           {Name: "http_method", Type: schema.ColumnTypeString},
	"http_host":                             {Name: "http_host", Type: schema.ColumnTypeString},
	"db_name":                               {Name: "db_name", Type: schema.ColumnTypeString},
	"db_operation":                          {Name: "db_operation", Type: schema.ColumnTypeString},
	"has_error":                             {Name: "has_error", Type: schema.ColumnTypeUInt8},
	"is_remote":                             {Name: "is_remote", Type: schema.ColumnTypeString},
	"resource_string_service$$name":         {Name: "resource_string_service$$name", Type: schema.ColumnTypeString},
	"attribute_string_http$$route":          {Name: "attribute_string_http$$route", Type: schema.ColumnTypeString},
	"attribute_string_messaging$$system":    {Name: "attribute_string_messaging$$system", Type: schema.ColumnTypeString},
	"attribute_string_messaging$$operation": {Name: "attribute_string_messaging$$operation", Type: schema.ColumnTypeString},
	"attribute_string_db$$system":           {Name: "attribute_string_db$$system", Type: schema.ColumnTypeString},
	"attribute_string_rpc$$system":          {Name: "attribute_string_rpc$$system", Type: schema.ColumnTypeString},
	"attribute_string_rpc$$service":         {Name: "attribute_string_rpc$$service", Type: schema.ColumnTypeString},
	"attribute_string_rpc$$method":          {Name: "attribute_string_rpc$$method", Type: schema.ColumnTypeString},
	"attribute_string_peer$$service":        {Name: "attribute_string_peer$$service", Type: schema.ColumnTypeString},

	"traceID":          {Name: "traceID", Type: schema.ColumnTypeString},
	"spanID":           {Name: "spanID", Type: schema.ColumnTypeString},
	"parentSpanID":     {Name: "parentSpanID", Type: schema.ColumnTypeString},
	"spanKind":         {Name: "spanKind", Type: schema.ColumnTypeString},
	"durationNano":     {Name: "durationNano", Type: schema.ColumnTypeUInt64},
	"statusCode":       {Name: "statusCode", Type: schema.ColumnTypeInt16},
	"statusMessage":    {Name: "statusMessage", Type: schema.ColumnTypeString},
	"statusCodeString": {Name: "statusCodeString", Type: schema.ColumnTypeString},

	"references":         {Name: "references", Type: schema.ColumnTypeString},
	"responseStatusCode": {Name: "responseStatusCode", Type: schema.ColumnTypeString},
	"externalHttpUrl":    {Name: "externalHttpUrl", Type: schema.ColumnTypeString},
	"httpUrl":            {Name: "httpUrl", Type: schema.ColumnTypeString},
	"externalHttpMethod": {Name: "externalHttpMethod", Type: schema.ColumnTypeString},

	"resource_string_service$$name_exists":         {Name: "resource_string_service$$name_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_http$$route_exists":          {Name: "attribute_string_http$$route_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_messaging$$system_exists":    {Name: "attribute_string_messaging$$system_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_messaging$$operation_exists": {Name: "attribute_string_messaging$$operation_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_db$$system_exists":           {Name: "attribute_string_db$$system_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_rpc$$system_exists":          {Name: "attribute_string_rpc$$system_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_rpc$$service_exists":         {Name: "attribute_string_rpc$$service_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_rpc$$method_exists":          {Name: "attribute_string_rpc$$method_exists", Type: schema.ColumnTypeUInt8},
	"attribute_string_peer$$service_exists":        {Name: "attribute_string_peer$$service_exists", Type: schema.ColumnTypeUInt8},
}

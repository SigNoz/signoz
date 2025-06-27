package telemetrytraces

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

var (
	IntrinsicFields = []string{
		"trace_id",
		"span_id",
		"trace_state",
		"parent_span_id",
		"flags",
		"name",
		"kind",
		"kind_string",
		"duration_nano",
		"status_code",
		"status_message",
		"status_code_string",
	}
	IntrinsicFieldsDeprecated = []string{
		"traceID",
		"spanID",
		"parentSpanID",
		"spanKind",
		"durationNano",
		"statusCode",
		"statusMessage",
		"statusCodeString",
	}

	CalculatedFields = []string{
		"response_status_code",
		"external_http_url",
		"http_url",
		"external_http_method",
		"http_method",
		"http_host",
		"db_name",
		"db_operation",
		"has_error",
		"is_remote",
	}

	CalculatedFieldsDeprecated = []string{
		"responseStatusCode",
		"externalHttpUrl",
		"httpUrl",
		"externalHttpMethod",
		"httpMethod",
		"httpHost",
		"dbName",
		"dbOperation",
		"hasError",
		"isRemote",
	}
	SpanSearchScopeRoot       = "isroot"
	SpanSearchScopeEntryPoint = "isentrypoint"

	DefaultFields = []telemetrytypes.TelemetryFieldKey{
		{
			Name:         "timestamp",
			FieldContext: telemetrytypes.FieldContextSpan,
		},
		{
			Name:         "span_id",
			FieldContext: telemetrytypes.FieldContextSpan,
		},
		{
			Name:         "trace_id",
			FieldContext: telemetrytypes.FieldContextSpan,
		},
		{
			Name:         "name",
			FieldContext: telemetrytypes.FieldContextSpan,
		},
		{
			Name:          "service.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:         "duration_nano",
			FieldContext: telemetrytypes.FieldContextSpan,
		},
		{
			Name:         "response_status_code",
			FieldContext: telemetrytypes.FieldContextSpan,
		},
	}
)

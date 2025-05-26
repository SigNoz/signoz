package telemetrytraces

var (
	IntrinsicFields = []string{
		"timestamp",
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
)

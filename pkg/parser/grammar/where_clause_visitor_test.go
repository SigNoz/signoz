package parser

import (
	"reflect"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestConvertToClickHouseLogsQuery(t *testing.T) {
	cases := []struct {
		name                 string
		fieldKeys            map[string][]telemetrytypes.TelemetryFieldKey
		query                string
		expectedSearchString string
		expectedSearchArgs   []any
	}{
		{
			name: "test-simple-service-name-filter",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "service.name=redis",
			expectedSearchString: "WHERE (resources_string['service.name'] = ?)",
			expectedSearchArgs:   []any{"redis"},
		},
		{
			name: "test-simple-service-name-filter-with-materialised-column",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
				},
			},
			query:                "service.name=redis",
			expectedSearchString: "WHERE (resource_string_service$$name = ?)",
			expectedSearchArgs:   []any{"redis"},
		},
		{
			name: "http-status-code-multiple-data-types",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code=200",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] = ? OR toFloat64OrNull(attributes_string['http.status_code']) = ?)",
			expectedSearchArgs:   []any{float64(200), float64(200)},
		},
		{
			name: "http-status-code-multiple-data-types-between-operator",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code between 200 and 300",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] BETWEEN ? AND ? OR toFloat64OrNull(attributes_string['http.status_code']) BETWEEN ? AND ?)",
			expectedSearchArgs:   []any{float64(200), float64(300), float64(200), float64(300)},
		},
		{
			name: "response-body-multiple-data-types-string-contains",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"response.body": {
					{
						Name:          "response.body",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
					{
						Name:          "response.body",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "response.body contains error",
			expectedSearchString: "WHERE (LOWER(toString(attributes_number['response.body'])) LIKE LOWER(?) OR LOWER(attributes_string['response.body']) LIKE LOWER(?))",
			expectedSearchArgs:   []any{"%error%", "%error%"},
		},
		{
			name: "search-on-top-level-key",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"severity_text": {
					{
						Name:          "severity_text",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextLog,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "severity_text=error",
			expectedSearchString: "WHERE (severity_text = ?)",
			expectedSearchArgs:   []any{"error"},
		},
		{
			name: "search-on-top-level-key-conflict-with-attribute",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"severity_text": {
					{
						Name:          "severity_text",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextLog,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "severity_text",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "severity_text=error",
			expectedSearchString: "WHERE (severity_text = ? OR attributes_string['severity_text'] = ?)",
			expectedSearchArgs:   []any{"error", "error"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resources_string['k8s.namespace.name'] = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute-materialised-column",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resource_string_k8s$$namespace$$name = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "boolean-collision-with-attribute-field-and-data-type-boolean",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"did_user_login": {
					{
						Name:          "did_user_login",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeBool,
					},
					{
						Name:          "did_user_login",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "did_user_login=true",
			expectedSearchString: "WHERE (attributes_bool['did_user_login'] = ? OR attributes_string['did_user_login'] = ?)",
			expectedSearchArgs:   []any{true, "true"},
		},
		{
			name: "regexp-search",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name REGEXP 'test' OR service.name='redis'",
			expectedSearchString: "WHERE (((match(attributes_string['k8s.namespace.name'], ?))) OR (resources_string['service.name'] = ?))",
			expectedSearchArgs:   []any{"test", "redis"},
		},
		{
			name:                 "full-text-search-multiple-words",
			fieldKeys:            map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                "waiting for response",
			expectedSearchString: "WHERE ((match(body, ?)) AND (match(body, ?)) AND (match(body, ?)))",
			expectedSearchArgs:   []any{"waiting", "for", "response"},
		},
		{
			name:                 "full-text-search-with-phrase-search",
			fieldKeys:            map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                `"waiting for response"`,
			expectedSearchString: "WHERE (match(body, ?))",
			expectedSearchArgs:   []any{"waiting for response"},
		},
		{
			name:                 "full-text-search-with-word-and-not-word",
			fieldKeys:            map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                "error NOT buggy_app",
			expectedSearchString: "WHERE ((match(body, ?)) AND NOT ((match(body, ?))))",
			expectedSearchArgs:   []any{"error", "buggy_app"},
		},
		{
			name:                 "full-text-search-with-word-and-not-word-and-not-word",
			fieldKeys:            map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                "error NOT buggy_app NOT redis",
			expectedSearchString: "WHERE ((match(body, ?)) AND NOT ((match(body, ?))) AND NOT ((match(body, ?))))",
			expectedSearchArgs:   []any{"error", "buggy_app", "redis"},
		},
		{
			name:                 "full-text-search-with-word-and-not-word-and-not-word-tricky",
			fieldKeys:            map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                "error NOT buggy_app OR redis",
			expectedSearchString: "WHERE (((match(body, ?)) AND NOT ((match(body, ?)))) OR (match(body, ?)))",
			expectedSearchArgs:   []any{"error", "buggy_app", "redis"},
		},
		{
			name: "has-function",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:         "service.name",
						Signal:       telemetrytypes.SignalLogs,
						FieldContext: telemetrytypes.FieldContextResource,
					},
				},
				"payload.user_ids": {
					{
						Name:         "payload.user_ids",
						Signal:       telemetrytypes.SignalLogs,
						FieldContext: telemetrytypes.FieldContextAttribute,
					},
				},
			},
			query:                "has(service.name, 'redis')",
			expectedSearchString: "WHERE (has(resources_string['service.name'], ?))",
			expectedSearchArgs:   []any{"redis"},
		},
		{
			name:                 "has-from-list-of-values",
			fieldKeys:            map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                "has(body.payload.user_ids[*], 'u1292')",
			expectedSearchString: "WHERE (has(JSONExtract(JSON_QUERY(body, '$.payload.user_ids[*]'), 'Array(String)'), ?))",
			expectedSearchArgs:   []any{"u1292"},
		},
		{
			name: "body-json-search-that-also-has-attribute-with-same-name",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
						Materialized:  true,
					},
				},
			},
			query:                "body.http.status_code=200",
			expectedSearchString: "WHERE (attribute_number_http$$status_code = ? OR JSONExtract(JSON_VALUE(body, '$.http.status_code'), 'Float64') = ?)",
			expectedSearchArgs:   []any{float64(200), float64(200)},
		},
	}

	for _, c := range cases {
		t.Logf("running test %s", c.name)
		chQuery, chQueryArgs, _, err := PrepareWhereClause(c.query, c.fieldKeys, telemetrylogs.NewConditionBuilder(), telemetrytypes.TelemetryFieldKey{
			Name:          "body",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		if err != nil {
			t.Errorf("Error converting query to ClickHouse: %v", err)
		}
		if chQuery != c.expectedSearchString {
			t.Errorf("Expected %s, got %s", c.expectedSearchString, chQuery)
		}
		if !reflect.DeepEqual(chQueryArgs, c.expectedSearchArgs) {
			for i, arg := range chQueryArgs {
				t.Logf("Expected %v with type %T, got %v with type %T\n", c.expectedSearchArgs[i], c.expectedSearchArgs[i], arg, arg)
			}
			t.Errorf("Expected %v, got %v", c.expectedSearchArgs, chQueryArgs)
		}
	}
}

func TestConvertToClickHouseSpansQuery(t *testing.T) {
	cases := []struct {
		name                 string
		fieldKeys            map[string][]telemetrytypes.TelemetryFieldKey
		query                string
		expectedSearchString string
		expectedSearchArgs   []any
	}{
		{
			name: "test-simple-service-name-filter",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "service.name=redis",
			expectedSearchString: "WHERE (resources_string['service.name'] = ?)",
			expectedSearchArgs:   []any{"redis"},
		},
		{
			name: "test-simple-service-name-filter-with-materialised-column",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
				},
			},
			query:                "service.name=redis",
			expectedSearchString: "WHERE (resource_string_service$$name = ?)",
			expectedSearchArgs:   []any{"redis"},
		},
		{
			name: "http-status-code-multiple-data-types",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code=200",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] = ? OR toFloat64OrNull(attributes_string['http.status_code']) = ?)",
			expectedSearchArgs:   []any{float64(200), float64(200)},
		},
		{
			name: "http-status-code-multiple-data-types-between-operator",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code between 200 and 300",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] BETWEEN ? AND ? OR toFloat64OrNull(attributes_string['http.status_code']) BETWEEN ? AND ?)",
			expectedSearchArgs:   []any{float64(200), float64(300), float64(200), float64(300)},
		},
		{
			name: "response-body-multiple-data-types-string-contains",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"response.body": {
					{
						Name:          "response.body",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
					{
						Name:          "response.body",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "response.body contains error",
			expectedSearchString: "WHERE (LOWER(toString(attributes_number['response.body'])) LIKE LOWER(?) OR LOWER(attributes_string['response.body']) LIKE LOWER(?))",
			expectedSearchArgs:   []any{"%error%", "%error%"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resources_string['k8s.namespace.name'] = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute-materialised-column",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resource_string_k8s$$namespace$$name = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "boolean-collision-with-attribute-field-and-data-type-boolean",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"did_user_login": {
					{
						Name:          "did_user_login",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeBool,
					},
					{
						Name:          "did_user_login",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "did_user_login=true",
			expectedSearchString: "WHERE (attributes_bool['did_user_login'] = ? OR attributes_string['did_user_login'] = ?)",
			expectedSearchArgs:   []any{true, "true"},
		},
		{
			name: "regexp-search",
			fieldKeys: map[string][]telemetrytypes.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"service.name": {
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name REGEXP 'test' OR service.name='redis'",
			expectedSearchString: "WHERE (((match(attributes_string['k8s.namespace.name'], ?))) OR (resources_string['service.name'] = ?))",
			expectedSearchArgs:   []any{"test", "redis"},
		},
	}

	for _, c := range cases {
		chQuery, chQueryArgs, _, err := PrepareWhereClause(c.query, c.fieldKeys, telemetrytraces.NewConditionBuilder(), telemetrytypes.TelemetryFieldKey{
			Name:          "dummy",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextSpan,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		if err != nil {
			t.Errorf("Error converting query to ClickHouse: %v", err)
		}
		if chQuery != c.expectedSearchString {
			t.Errorf("Expected %s, got %s", c.expectedSearchString, chQuery)
		}
		if !reflect.DeepEqual(chQueryArgs, c.expectedSearchArgs) {
			for i, arg := range chQueryArgs {
				t.Logf("Expected %v with type %T, got %v with type %T\n", c.expectedSearchArgs[i], c.expectedSearchArgs[i], arg, arg)
			}
			t.Errorf("Expected %v, got %v", c.expectedSearchArgs, chQueryArgs)
		}
	}
}

func TestConvertToClickHouseSpansQueryWithErrors(t *testing.T) {
	cases := []struct {
		name                   string
		fieldKeys              map[string][]telemetrytypes.TelemetryFieldKey
		query                  string
		expectedSearchString   string
		expectedSearchArgs     []any
		expectedErrorSubString string
		expectedWarnings       []error
	}{
		{
			name:                   "has-function-with-multiple-values",
			fieldKeys:              map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                  "key.that.does.not.exist = 'redis'",
			expectedSearchString:   "",
			expectedSearchArgs:     []any{},
			expectedErrorSubString: "key `key.that.does.not.exist` not found",
			expectedWarnings:       []error{},
		},
		{
			name:                   "unknown-function",
			fieldKeys:              map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                  "unknown.function()",
			expectedSearchString:   "",
			expectedSearchArgs:     []any{},
			expectedErrorSubString: "expecting {'(', NOT, HAS, HASANY, HASALL, QUOTED_TEXT, KEY, FREETEXT}",
			expectedWarnings:       []error{},
		},
		{
			name:                   "has-function-not-enough-params",
			fieldKeys:              map[string][]telemetrytypes.TelemetryFieldKey{},
			query:                  "has(key.that.does.not.exist)",
			expectedSearchString:   "",
			expectedSearchArgs:     []any{},
			expectedErrorSubString: "function `has` expects key and value parameters",
			expectedWarnings:       []error{},
		},
	}

	for _, c := range cases {
		_, _, warnings, err := PrepareWhereClause(c.query, c.fieldKeys, telemetrytraces.NewConditionBuilder(), telemetrytypes.TelemetryFieldKey{
			Name:          "dummy",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextSpan,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		})
		if err != nil {
			if !strings.Contains(err.Error(), c.expectedErrorSubString) {
				t.Errorf("Expected error %v, got %v", c.expectedErrorSubString, err)
			}
		}

		if len(warnings) != len(c.expectedWarnings) {
			t.Errorf("Expected %d warnings, got %d", len(c.expectedWarnings), len(warnings))
		}
		for i, warning := range warnings {
			if warning.Error() != c.expectedWarnings[i].Error() {
				t.Errorf("Expected warning %d to be %v, got %v", i, c.expectedWarnings[i], warning)
			}
		}
	}
}

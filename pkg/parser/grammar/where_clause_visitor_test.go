package parser

import (
	"fmt"
	"reflect"
	"testing"

	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetryspans"
	"github.com/SigNoz/signoz/pkg/types"
)

func TestConvertToClickHouseLogsQuery(t *testing.T) {
	cases := []struct {
		name                 string
		fieldKeys            map[string][]types.TelemetryFieldKey
		query                string
		expectedSearchString string
		expectedSearchArgs   []any
	}{
		{
			name: "test-simple-service-name-filter",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "service.name=redis",
			expectedSearchString: "WHERE (resources_string['service.name'] = ?)",
			expectedSearchArgs:   []any{"redis"},
		},
		{
			name: "test-simple-service-name-filter-with-materialised-column",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
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
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code=200",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] = ? OR toFloat64OrNull(attributes_string['http.status_code']) = ?)",
			expectedSearchArgs:   []any{float64(200), float64(200)},
		},
		{
			name: "http-status-code-multiple-data-types-between-operator",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code between 200 and 300",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] BETWEEN ? AND ? OR toFloat64OrNull(attributes_string['http.status_code']) BETWEEN ? AND ?)",
			expectedSearchArgs:   []any{float64(200), float64(300), float64(200), float64(300)},
		},
		{
			name: "response-body-multiple-data-types-string-contains",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"response.body": {
					{
						Name:          "response.body",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeFloat64,
					},
					{
						Name:          "response.body",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "response.body contains error",
			expectedSearchString: "WHERE (LOWER(toString(attributes_number['response.body'])) LIKE LOWER(?) OR LOWER(attributes_string['response.body']) LIKE LOWER(?))",
			expectedSearchArgs:   []any{"error", "error"},
		},
		{
			name: "search-on-top-level-key",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"severity_text": {
					{
						Name:          "severity_text",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextLog,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "severity_text=error",
			expectedSearchString: "WHERE (severity_text = ?)",
			expectedSearchArgs:   []any{"error"},
		},
		{
			name: "search-on-top-level-key-conflict-with-attribute",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"severity_text": {
					{
						Name:          "severity_text",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextLog,
						FieldDataType: types.FieldDataTypeString,
					},
					{
						Name:          "severity_text",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "severity_text=error",
			expectedSearchString: "WHERE (severity_text = ? OR attributes_string['severity_text'] = ?)",
			expectedSearchArgs:   []any{"error", "error"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resources_string['k8s.namespace.name'] = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute-materialised-column",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resource_string_k8s$$namespace$$name = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "boolean-collision-with-attribute-field-and-data-type-boolean",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"did_user_login": {
					{
						Name:          "did_user_login",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeBool,
					},
					{
						Name:          "did_user_login",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "did_user_login=true",
			expectedSearchString: "WHERE (attributes_bool['did_user_login'] = ? OR attributes_string['did_user_login'] = ?)",
			expectedSearchArgs:   []any{true, "true"},
		},
		{
			name: "regexp-search",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
				"service.name": {
					{
						Name:          "service.name",
						Signal:        types.SignalLogs,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name REGEXP 'test' OR service.name='redis'",
			expectedSearchString: "WHERE (((match(attributes_string['k8s.namespace.name'], ?))) OR (resources_string['service.name'] = ?))",
			expectedSearchArgs:   []any{"test", "redis"},
		},
		{
			name:                 "full-text-search",
			fieldKeys:            map[string][]types.TelemetryFieldKey{},
			query:                "waiting for response",
			expectedSearchString: "WHERE ((match(body, ?)) AND (match(body, ?)) AND (match(body, ?)))",
			expectedSearchArgs:   []any{"waiting", "for", "response"},
		},
		{
			name:                 "full-text-search-with-quoted-text",
			fieldKeys:            map[string][]types.TelemetryFieldKey{},
			query:                `"waiting for response"`,
			expectedSearchString: "WHERE (match(body, ?))",
			expectedSearchArgs:   []any{"waiting for response"},
		},
	}

	for _, c := range cases {
		fmt.Println("c.name", c.name)
		chQuery, chQueryArgs, err := PrepareWhereClause(c.query, c.fieldKeys, telemetrylogs.NewConditionBuilder(), types.TelemetryFieldKey{
			Name:          "body",
			Signal:        types.SignalLogs,
			FieldContext:  types.FieldContextLog,
			FieldDataType: types.FieldDataTypeString,
		})
		if err != nil {
			t.Errorf("Error converting query to ClickHouse: %v", err)
		}
		if chQuery != c.expectedSearchString {
			t.Errorf("Expected %s, got %s", c.expectedSearchString, chQuery)
		}
		if !reflect.DeepEqual(chQueryArgs, c.expectedSearchArgs) {
			for i, arg := range chQueryArgs {
				fmt.Printf("Expected %v with type %T, got %v with type %T\n", c.expectedSearchArgs[i], c.expectedSearchArgs[i], arg, arg)
			}
			t.Errorf("Expected %v, got %v", c.expectedSearchArgs, chQueryArgs)
		}
	}
}

func TestConvertToClickHouseSpansQuery(t *testing.T) {
	cases := []struct {
		name                 string
		fieldKeys            map[string][]types.TelemetryFieldKey
		query                string
		expectedSearchString string
		expectedSearchArgs   []any
	}{
		{
			name: "test-simple-service-name-filter",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "service.name=redis",
			expectedSearchString: "WHERE (resources_string['service.name'] = ?)",
			expectedSearchArgs:   []any{"redis"},
		},
		{
			name: "test-simple-service-name-filter-with-materialised-column",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
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
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code=200",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] = ? OR toFloat64OrNull(attributes_string['http.status_code']) = ?)",
			expectedSearchArgs:   []any{float64(200), float64(200)},
		},
		{
			name: "http-status-code-multiple-data-types-between-operator",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"http.status_code": {
					{
						Name:          "http.status_code",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeFloat64,
					},
					{
						Name:          "http.status_code",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "http.status_code between 200 and 300",
			expectedSearchString: "WHERE (attributes_number['http.status_code'] BETWEEN ? AND ? OR toFloat64OrNull(attributes_string['http.status_code']) BETWEEN ? AND ?)",
			expectedSearchArgs:   []any{float64(200), float64(300), float64(200), float64(300)},
		},
		{
			name: "response-body-multiple-data-types-string-contains",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"response.body": {
					{
						Name:          "response.body",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeFloat64,
					},
					{
						Name:          "response.body",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "response.body contains error",
			expectedSearchString: "WHERE (LOWER(toString(attributes_number['response.body'])) LIKE LOWER(?) OR LOWER(attributes_string['response.body']) LIKE LOWER(?))",
			expectedSearchArgs:   []any{"error", "error"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resources_string['k8s.namespace.name'] = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "collision-with-attribute-field-and-resource-attribute-materialised-column",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name=test",
			expectedSearchString: "WHERE (resource_string_k8s$$namespace$$name = ? OR attributes_string['k8s.namespace.name'] = ?)",
			expectedSearchArgs:   []any{"test", "test"},
		},
		{
			name: "boolean-collision-with-attribute-field-and-data-type-boolean",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"did_user_login": {
					{
						Name:          "did_user_login",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeBool,
					},
					{
						Name:          "did_user_login",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "did_user_login=true",
			expectedSearchString: "WHERE (attributes_bool['did_user_login'] = ? OR attributes_string['did_user_login'] = ?)",
			expectedSearchArgs:   []any{true, "true"},
		},
		{
			name: "regexp-search",
			fieldKeys: map[string][]types.TelemetryFieldKey{
				"k8s.namespace.name": {
					{
						Name:          "k8s.namespace.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextAttribute,
						FieldDataType: types.FieldDataTypeString,
					},
				},
				"service.name": {
					{
						Name:          "service.name",
						Signal:        types.SignalTraces,
						FieldContext:  types.FieldContextResource,
						FieldDataType: types.FieldDataTypeString,
					},
				},
			},
			query:                "k8s.namespace.name REGEXP 'test' OR service.name='redis'",
			expectedSearchString: "WHERE (((match(attributes_string['k8s.namespace.name'], ?))) OR (resources_string['service.name'] = ?))",
			expectedSearchArgs:   []any{"test", "redis"},
		},
	}

	for _, c := range cases {
		chQuery, chQueryArgs, err := PrepareWhereClause(c.query, c.fieldKeys, telemetryspans.NewConditionBuilder(), types.TelemetryFieldKey{
			Name:          "dummy",
			Signal:        types.SignalTraces,
			FieldContext:  types.FieldContextSpan,
			FieldDataType: types.FieldDataTypeString,
		})
		if err != nil {
			t.Errorf("Error converting query to ClickHouse: %v", err)
		}
		if chQuery != c.expectedSearchString {
			t.Errorf("Expected %s, got %s", c.expectedSearchString, chQuery)
		}
		if !reflect.DeepEqual(chQueryArgs, c.expectedSearchArgs) {
			for i, arg := range chQueryArgs {
				fmt.Printf("Expected %v with type %T, got %v with type %T\n", c.expectedSearchArgs[i], c.expectedSearchArgs[i], arg, arg)
			}
			t.Errorf("Expected %v, got %v", c.expectedSearchArgs, chQueryArgs)
		}
	}
}

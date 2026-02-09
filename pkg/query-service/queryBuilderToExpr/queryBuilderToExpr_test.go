package queryBuilderToExpr

import (
	"testing"

	signozstanzahelper "github.com/SigNoz/signoz-otel-collector/processor/signozlogspipelineprocessor/stanza/operator/helper"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/expr-lang/expr/vm"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	"github.com/stretchr/testify/assert"
)

func TestParseExpression(t *testing.T) {
	var testCases = []struct {
		Name        string
		Query       *v3.FilterSet
		Expr        string
		ExpectError bool
	}{
		{
			Name: "equal",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "checkbody", Operator: "="},
			}},
			Expr: `attributes["key"] == "checkbody"`,
		},
		{
			Name: "not equal",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "checkbody", Operator: "!="},
			}},
			Expr: `attributes["key"] != "checkbody"`,
		},
		{
			Name: "less than",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<"},
			}},
			Expr: `attributes["key"] != nil && attributes["key"] < 10`,
		},
		{
			Name: "greater than",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: ">"},
			}},
			Expr: `attributes["key"] != nil && attributes["key"] > 10`,
		},
		{
			Name: "less than equal",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<="},
			}},
			Expr: `attributes["key"] != nil && attributes["key"] <= 10`,
		},
		{
			Name: "greater than equal",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: ">="},
			}},
			Expr: `attributes["key"] != nil && attributes["key"] >= 10`,
		},
		// case sensitive
		{
			Name: "body contains",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "contains"},
			}},
			Expr: `body != nil && lower(body) contains lower("checkbody")`,
		},
		{
			Name: "body.log.message exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body.log.message", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
			}},
			Expr: `(((type(body) == "string" && isJSON(body)) && "log.message" in fromJSON(body)) or (type(body) == "map" && (body.log.message != nil)))`,
		},
		{
			Name: "body.log.message not exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body.log.message", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
			}},
			Expr: `(((type(body) == "string" && isJSON(body)) && "log.message" not in fromJSON(body)) or (type(body) == "map" && (body.log.message == nil)))`,
		},
		{
			Name: "body ncontains",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "ncontains"},
			}},
			Expr: `body != nil && lower(body) not contains lower("checkbody")`,
		},
		{
			Name: "body regex",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex$", Operator: "regex"},
			}},
			Expr: `body != nil && body matches "[0-1]+regex$"`,
		},
		{
			Name: "body not regex",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex$", Operator: "nregex"},
			}},
			Expr: `body != nil && body not matches "[0-1]+regex$"`,
		},
		{
			Name: "regex with escape characters",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: `^Executing \[\S+@\S+:[0-9]+\] \S+".*`, Operator: "regex"},
			}},
			Expr: `body != nil && body matches "^Executing \\[\\S+@\\S+:[0-9]+\\] \\S+\".*"`,
		},
		{
			Name: "invalid regex",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-9]++", Operator: "nregex"},
			}},
			Expr:        `body != nil && lower(body) not matches "[0-9]++"`,
			ExpectError: true,
		},
		{
			Name: "in",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []any{1, 2, 3, 4}, Operator: "in"},
			}},
			Expr: `attributes["key"] != nil && attributes["key"] in [1,2,3,4]`,
		},
		{
			Name: "not in",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []any{"1", "2"}, Operator: "nin"},
			}},
			Expr: `attributes["key"] != nil && attributes["key"] not in ['1','2']`,
		},
		{
			Name: "exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "exists"},
			}},
			Expr: `"key" in attributes`,
		},
		{
			Name: "not exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
			}},
			Expr: `"key" not in attributes`,
		},
		{
			Name: "trace_id not exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
			}},
			Expr: `trace_id == nil`,
		},
		{
			Name: "trace_id exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
			}},
			Expr: `trace_id != nil`,
		},
		{
			Name: "span_id not exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "span_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
			}},
			Expr: `span_id == nil`,
		},
		{
			Name: "span_id exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "span_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
			}},
			Expr: `span_id != nil`,
		},
		{
			Name: "Multi filter",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<="},
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex$", Operator: "nregex"},
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
			}},
			Expr: `attributes["key"] != nil && attributes["key"] <= 10 and body != nil && body not matches "[0-1]+regex$" and "key" not in attributes`,
		},
		{
			Name: "incorrect multi filter",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: 10, Operator: "<="},
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-9]++", Operator: "nregex"},
				{Key: v3.AttributeKey{Key: "key", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
			}},
			Expr:        `attributes["key"] != nil && attributes["key"] <= 10 and body not matches "[0-9]++" and "key" not in attributes`,
			ExpectError: true,
		},
	}

	for _, tt := range testCases {
		t.Run(tt.Name, func(t *testing.T) {
			x, err := Parse(tt.Query)
			if tt.ExpectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.Expr, x)
			}
		})
	}
}

type EntryComposite struct {
	ID int
	*entry.Entry
}

// makeEntry creates an EntryComposite for tests. Pass nil for traceID/spanID to mean "not set".
func makeEntry(id int, body any, attributes, resource map[string]any, traceID, spanID []byte) EntryComposite {
	e := entry.New()
	e.Body = body
	if attributes != nil {
		e.Attributes = attributes
	} else {
		e.Attributes = make(map[string]any)
	}
	if resource != nil {
		e.Resource = resource
	} else {
		e.Resource = make(map[string]any)
	}
	if traceID != nil {
		e.TraceID = traceID
	}
	if spanID != nil {
		e.SpanID = spanID
	}
	return EntryComposite{ID: id, Entry: e}
}

func TestExpressionVSEntry(t *testing.T) {
	// Dataset: entries with varied body (JSON and plain text), attributes, trace_id, span_id for filter testing.
	// IDs 0..12: JSON bodies (body.msg / body.log etc. work). IDs 13..17: simple text log bodies.
	dataset := []EntryComposite{
		// JSON body entries (0-12)
		makeEntry(0, `{"msg":"hello world"}`, map[string]any{"level": "info"}, map[string]any{"env": "prod", "host": "node-0"}, nil, nil),
		makeEntry(1, `{"msg":"error occurred", "missing": "value"}`, map[string]any{"level": "error"}, map[string]any{"env": "prod", "host": "node-1"}, []byte("trace1"), []byte("span1")),
		makeEntry(2, `{"msg":"checkbody substring"}`, map[string]any{"level": "info"}, map[string]any{"env": "staging", "host": "node-2"}, []byte("trace2"), nil),
		makeEntry(3, `{"msg":"no match here"}`, map[string]any{"level": "debug"}, map[string]any{"env": "staging", "host": "node-3"}, nil, []byte("span3")),
		makeEntry(4, `{"msg":"101regex suffix"}`, map[string]any{"code": "200", "count": int64(5)}, map[string]any{"env": "prod", "host": "node-4"}, nil, nil),
		makeEntry(5, `{"msg":"plain text only"}`, map[string]any{"code": "404", "count": int64(10)}, map[string]any{"env": "prod", "host": "node-5"}, []byte("trace5"), []byte("span5")),
		makeEntry(6, `{"log":{"message":"user login"}}`, map[string]any{"service": "auth"}, map[string]any{"env": "dev", "host": "node-6"}, nil, nil),
		makeEntry(7, `{"log":{"message":"user logout"}}`, map[string]any{"service": "auth", "user_id": "u1"}, map[string]any{"env": "dev", "host": "node-7"}, []byte("trace7"), nil),
		makeEntry(8, `{"event":"click"}`, map[string]any{"service": "api"}, map[string]any{"env": "dev", "host": "node-8"}, nil, nil),
		makeEntry(9, `{"msg":"checkbody"}`, map[string]any{"tag": "exact", "num": int64(9)}, map[string]any{"env": "prod", "host": "node-9"}, nil, nil),
		makeEntry(10, `{"msg":"CHECKBODY case"}`, map[string]any{"tag": "case", "num": int64(10)}, map[string]any{"env": "staging", "host": "node-10"}, nil, nil),
		makeEntry(11, `{"msg":"foo"}`, map[string]any{"status": "active", "score": int64(100)}, map[string]any{"env": "prod", "host": "node-11"}, nil, nil),
		makeEntry(12, `{"msg":"bar"}`, map[string]any{"status": "inactive", "score": int64(50)}, map[string]any{"env": "staging", "host": "node-12"}, []byte("trace12"), []byte("span12")),
		// Plain text log body entries (13-17)
		makeEntry(13, "Server started on port 8080", map[string]any{"component": "server"}, map[string]any{"env": "prod", "host": "node-13"}, nil, nil),
		makeEntry(14, "Connection refused to 10.0.0.1:5432", map[string]any{"level": "error"}, map[string]any{"env": "prod", "host": "node-14"}, nil, nil),
		makeEntry(15, "User login failed for admin", map[string]any{"service": "auth", "level": "warn"}, map[string]any{"env": "dev", "host": "node-15"}, []byte("trace15"), nil),
		makeEntry(16, "checkbody in text log", map[string]any{"level": "info"}, map[string]any{"env": "staging", "host": "node-16"}, nil, nil),
		makeEntry(17, "WARN: disk full on /var", map[string]any{"level": "warn"}, map[string]any{"env": "prod", "host": "node-17"}, nil, []byte("span17")),
		// Body as map (not string) entries (18-20)
		makeEntry(18, map[string]any{"msg": "checkbody substring", "level": "info"}, map[string]any{"source": "map"}, map[string]any{"env": "prod", "host": "node-18"}, nil, nil),
		makeEntry(19, map[string]any{"log": map[string]any{"message": "nested value in map body"}, "missing": true}, map[string]any{"source": "map"}, map[string]any{"env": "staging", "host": "node-19"}, []byte("trace19"), nil),
		makeEntry(20, map[string]any{"event": "deploy", "version": "1.2.0"}, map[string]any{"source": "map", "level": "info"}, map[string]any{"env": "dev", "host": "node-20"}, nil, []byte("span20")),
	}

	var testCases = []struct {
		Name            string
		Query           *v3.FilterSet
		ExpectedMatches []int
	}{
		{
			Name: "resource equal (env)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "prod", Operator: "="},
			}},
			ExpectedMatches: []int{0, 1, 4, 5, 9, 11, 13, 14, 17, 18},
		},
		{
			Name: "resource not equal (env)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "prod", Operator: "!="},
			}},
			ExpectedMatches: []int{2, 3, 6, 7, 8, 10, 12, 15, 16, 19, 20},
		},
		{
			Name: "attribute less than (numeric)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "count", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 8, Operator: "<"},
			}},
			ExpectedMatches: []int{4},
		},
		{
			Name: "attribute greater than (numeric)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "count", DataType: v3.AttributeKeyDataTypeInt64, Type: v3.AttributeKeyTypeTag}, Value: 8, Operator: ">"},
			}},
			ExpectedMatches: []int{5},
		},
		{
			Name: "body contains (case insensitive)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "contains"},
			}},
			ExpectedMatches: []int{2, 9, 10, 16},
		},
		{
			Name: "body ncontains",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "ncontains"},
			}},
			ExpectedMatches: []int{0, 1, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 17},
		},
		{
			Name: "body.msg (case insensitive)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body.msg", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: false}, Value: "checkbody", Operator: "contains"},
			}},
			ExpectedMatches: []int{2, 9, 10, 18},
		},
		{
			Name: "body regex",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex", Operator: "regex"},
			}},
			ExpectedMatches: []int{4},
		},
		{
			Name: "body not regex",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex", Operator: "nregex"},
			}},
			ExpectedMatches: []int{0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17},
		},
		// body.log.message exists/nexists: expr checks "log.message" in fromJSON(body); nested key
		// semantics depend on signoz stanza helper. Omitted here to avoid coupling to env shape.
		{
			Name: "body top-level key exists (body.msg)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body.msg", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
			}},
			ExpectedMatches: []int{0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 18},
		},
		{
			Name: "body top-level key not exists (body.missing)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body.missing", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
			}},
			ExpectedMatches: []int{0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 20},
		},
		{
			Name: "attribute exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "service", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "exists"},
			}},
			ExpectedMatches: []int{6, 7, 8, 15},
		},
		{
			Name: "attribute not exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "service", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
			}},
			ExpectedMatches: []int{0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20},
		},
		{
			Name: "trace_id exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
			}},
			ExpectedMatches: []int{1, 2, 5, 7, 12, 15, 19},
		},
		{
			Name: "trace_id not exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
			}},
			ExpectedMatches: []int{0, 3, 4, 6, 8, 9, 10, 11, 13, 14, 16, 17, 18, 20},
		},
		{
			Name: "span_id exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "span_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
			}},
			ExpectedMatches: []int{1, 3, 5, 12, 17, 20},
		},
		{
			Name: "span_id not exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "span_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
			}},
			ExpectedMatches: []int{0, 2, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19},
		},
		{
			Name: "in (attribute in list)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []any{"info", "error"}, Operator: "in"},
			}},
			ExpectedMatches: []int{0, 1, 2, 14, 16, 20},
		},
		{
			Name: "not in (attribute not in list)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: []any{"error", "warn"}, Operator: "nin"},
			}},
			ExpectedMatches: []int{0, 2, 3, 16, 20},
		},
		{
			Name: "multi filter AND",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "staging", Operator: "="},
				{Key: v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "info", Operator: "="},
			}},
			ExpectedMatches: []int{2, 16},
		},
		{
			Name: "multi filter AND (two attributes)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "service", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "auth", Operator: "="},
				{Key: v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Operator: "nexists"},
			}},
			ExpectedMatches: []int{6, 7},
		},
		// Multi-filter variations: body + attribute, three conditions, trace/span + attribute
		{
			Name: "multi filter AND body contains + attribute",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "Connection", Operator: "contains"},
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "prod", Operator: "="},
			}},
			ExpectedMatches: []int{14},
		},
		{
			Name: "multi filter AND body contains + service",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "login", Operator: "contains"},
				{Key: v3.AttributeKey{Key: "service", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "auth", Operator: "="},
			}},
			ExpectedMatches: []int{6, 15},
		},
		{
			Name: "multi filter AND env + level (prod error)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "prod", Operator: "="},
				{Key: v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "error", Operator: "="},
			}},
			ExpectedMatches: []int{1, 14},
		},
		{
			Name: "multi filter AND three conditions (staging + checkbody + info)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "staging", Operator: "="},
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "contains"},
				{Key: v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "info", Operator: "="},
			}},
			ExpectedMatches: []int{2, 16},
		},
		{
			Name: "multi filter AND trace_id exists + body contains",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "checkbody", Operator: "contains"},
			}},
			ExpectedMatches: []int{2},
		},
		{
			Name: "multi filter AND span_id nexists + service auth",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "span_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
				{Key: v3.AttributeKey{Key: "service", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "auth", Operator: "="},
			}},
			ExpectedMatches: []int{6, 7, 15},
		},
		{
			Name: "multi filter AND body regex + attribute",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "[0-1]+regex", Operator: "regex"},
				{Key: v3.AttributeKey{Key: "code", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "200", Operator: "="},
			}},
			ExpectedMatches: []int{4},
		},
		{
			Name: "multi filter AND no trace_id + no span_id + env prod",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
				{Key: v3.AttributeKey{Key: "span_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "nexists"},
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "prod", Operator: "="},
			}},
			ExpectedMatches: []int{0, 4, 9, 11, 13, 14, 18},
		},
		{
			Name: "multi filter AND level warn + body contains",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "level", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "warn", Operator: "="},
				{Key: v3.AttributeKey{Key: "body", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "disk", Operator: "contains"},
			}},
			ExpectedMatches: []int{17},
		},
		{
			Name: "no matches (attribute value not present)",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "env", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeResource}, Value: "never", Operator: "="},
			}},
			ExpectedMatches: []int{},
		},
		{
			Name: "attribute equal and trace_id exists",
			Query: &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{
				{Key: v3.AttributeKey{Key: "code", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeTag}, Value: "404", Operator: "="},
				{Key: v3.AttributeKey{Key: "trace_id", DataType: v3.AttributeKeyDataTypeString, Type: v3.AttributeKeyTypeUnspecified, IsColumn: true}, Value: "", Operator: "exists"},
			}},
			ExpectedMatches: []int{5},
		},
	}

	for _, tt := range testCases {
		t.Run(tt.Name, func(t *testing.T) {
			expression, err := Parse(tt.Query)
			assert.NoError(t, err)

			compiled, hasBodyFieldRef, err := signozstanzahelper.ExprCompileBool(expression)
			assert.NoError(t, err)

			matchedIDs := []int{}
			for _, d := range dataset {
				env := signozstanzahelper.GetExprEnv(d.Entry, hasBodyFieldRef)
				matches, err := vm.Run(compiled, env)
				signozstanzahelper.PutExprEnv(env)
				if err != nil {
					// Eval error (e.g. fromJSON on non-JSON body) => treat as no match
					continue
				}
				if matches != nil && matches.(bool) {
					matchedIDs = append(matchedIDs, d.ID)
				}
			}
			assert.Equal(t, tt.ExpectedMatches, matchedIDs, "query %q", tt.Name)
		})
	}
}

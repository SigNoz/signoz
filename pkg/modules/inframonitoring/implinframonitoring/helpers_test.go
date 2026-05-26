package implinframonitoring

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func groupByKey(name string) qbtypes.GroupByKey {
	return qbtypes.GroupByKey{
		TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: name},
	}
}

func TestIsKeyInGroupByAttrs(t *testing.T) {
	tests := []struct {
		name          string
		groupByAttrs  []qbtypes.GroupByKey
		key           string
		expectedFound bool
	}{
		{
			name:          "key present in single-element list",
			groupByAttrs:  []qbtypes.GroupByKey{groupByKey("host.name")},
			key:           "host.name",
			expectedFound: true,
		},
		{
			name: "key present in multi-element list",
			groupByAttrs: []qbtypes.GroupByKey{
				groupByKey("host.name"),
				groupByKey("os.type"),
				groupByKey("k8s.cluster.name"),
			},
			key:           "os.type",
			expectedFound: true,
		},
		{
			name: "key at last position",
			groupByAttrs: []qbtypes.GroupByKey{
				groupByKey("host.name"),
				groupByKey("os.type"),
			},
			key:           "os.type",
			expectedFound: true,
		},
		{
			name:          "key not in list",
			groupByAttrs:  []qbtypes.GroupByKey{groupByKey("host.name")},
			key:           "os.type",
			expectedFound: false,
		},
		{
			name:          "empty group by list",
			groupByAttrs:  []qbtypes.GroupByKey{},
			key:           "host.name",
			expectedFound: false,
		},
		{
			name:          "nil group by list",
			groupByAttrs:  nil,
			key:           "host.name",
			expectedFound: false,
		},
		{
			name:          "empty key string",
			groupByAttrs:  []qbtypes.GroupByKey{groupByKey("host.name")},
			key:           "",
			expectedFound: false,
		},
		{
			name:          "empty key matches empty-named group by key",
			groupByAttrs:  []qbtypes.GroupByKey{groupByKey("")},
			key:           "",
			expectedFound: true,
		},
		{
			name: "partial match does not count",
			groupByAttrs: []qbtypes.GroupByKey{
				groupByKey("host"),
			},
			key:           "host.name",
			expectedFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isKeyInGroupByAttrs(tt.groupByAttrs, tt.key)
			if got != tt.expectedFound {
				t.Errorf("isKeyInGroupByAttrs(%v, %q) = %v, want %v",
					tt.groupByAttrs, tt.key, got, tt.expectedFound)
			}
		})
	}
}

func TestMergeFilterExpressions(t *testing.T) {
	tests := []struct {
		name            string
		queryFilterExpr string
		reqFilterExpr   string
		expected        string
	}{
		{
			name:            "both non-empty",
			queryFilterExpr: "cpu > 50",
			reqFilterExpr:   "host.name = 'web-1'",
			expected:        "(cpu > 50) AND (host.name = 'web-1')",
		},
		{
			name:            "query empty, req non-empty",
			queryFilterExpr: "",
			reqFilterExpr:   "host.name = 'web-1'",
			expected:        "host.name = 'web-1'",
		},
		{
			name:            "query non-empty, req empty",
			queryFilterExpr: "cpu > 50",
			reqFilterExpr:   "",
			expected:        "cpu > 50",
		},
		{
			name:            "both empty",
			queryFilterExpr: "",
			reqFilterExpr:   "",
			expected:        "",
		},
		{
			name:            "whitespace-only query treated as empty",
			queryFilterExpr: "   ",
			reqFilterExpr:   "host.name = 'web-1'",
			expected:        "host.name = 'web-1'",
		},
		{
			name:            "whitespace-only req treated as empty",
			queryFilterExpr: "cpu > 50",
			reqFilterExpr:   "   ",
			expected:        "cpu > 50",
		},
		{
			name:            "both whitespace-only",
			queryFilterExpr: "  ",
			reqFilterExpr:   "  ",
			expected:        "",
		},
		{
			name:            "leading/trailing whitespace trimmed before merge",
			queryFilterExpr: "  cpu > 50  ",
			reqFilterExpr:   "  mem < 80  ",
			expected:        "(cpu > 50) AND (mem < 80)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mergeFilterExpressions(tt.queryFilterExpr, tt.reqFilterExpr)
			if got != tt.expected {
				t.Errorf("mergeFilterExpressions(%q, %q) = %q, want %q",
					tt.queryFilterExpr, tt.reqFilterExpr, got, tt.expected)
			}
		})
	}
}

func TestCompositeKeyFromList(t *testing.T) {
	tests := []struct {
		name     string
		parts    []string
		expected string
	}{
		{
			name:     "single part",
			parts:    []string{"web-1"},
			expected: "web-1",
		},
		{
			name:     "multiple parts joined with null separator",
			parts:    []string{"web-1", "linux", "us-east"},
			expected: "web-1\x00linux\x00us-east",
		},
		{
			name:     "empty slice returns empty string",
			parts:    []string{},
			expected: "",
		},
		{
			name:     "nil slice returns empty string",
			parts:    nil,
			expected: "",
		},
		{
			name:     "parts with empty strings",
			parts:    []string{"web-1", "", "us-east"},
			expected: "web-1\x00\x00us-east",
		},
		{
			name:     "all empty strings",
			parts:    []string{"", ""},
			expected: "\x00",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := compositeKeyFromList(tt.parts)
			if got != tt.expected {
				t.Errorf("compositeKeyFromList(%v) = %q, want %q",
					tt.parts, got, tt.expected)
			}
		})
	}
}

func TestCompositeKeyFromLabels(t *testing.T) {
	tests := []struct {
		name     string
		labels   map[string]string
		groupBy  []qbtypes.GroupByKey
		expected string
	}{
		{
			name:     "single group-by key",
			labels:   map[string]string{"host.name": "web-1"},
			groupBy:  []qbtypes.GroupByKey{groupByKey("host.name")},
			expected: "web-1",
		},
		{
			name: "multiple group-by keys joined with null separator",
			labels: map[string]string{
				"host.name": "web-1",
				"os.type":   "linux",
			},
			groupBy:  []qbtypes.GroupByKey{groupByKey("host.name"), groupByKey("os.type")},
			expected: "web-1\x00linux",
		},
		{
			name:     "missing label yields empty segment",
			labels:   map[string]string{"host.name": "web-1"},
			groupBy:  []qbtypes.GroupByKey{groupByKey("host.name"), groupByKey("os.type")},
			expected: "web-1\x00",
		},
		{
			name:     "empty labels map",
			labels:   map[string]string{},
			groupBy:  []qbtypes.GroupByKey{groupByKey("host.name")},
			expected: "",
		},
		{
			name:     "empty group-by slice",
			labels:   map[string]string{"host.name": "web-1"},
			groupBy:  []qbtypes.GroupByKey{},
			expected: "",
		},
		{
			name:     "nil labels map",
			labels:   nil,
			groupBy:  []qbtypes.GroupByKey{groupByKey("host.name")},
			expected: "",
		},
		{
			name: "order matches group-by order, not map iteration order",
			labels: map[string]string{
				"z": "last",
				"a": "first",
				"m": "middle",
			},
			groupBy:  []qbtypes.GroupByKey{groupByKey("a"), groupByKey("m"), groupByKey("z")},
			expected: "first\x00middle\x00last",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := compositeKeyFromLabels(tt.labels, tt.groupBy)
			if got != tt.expected {
				t.Errorf("compositeKeyFromLabels(%v, %v) = %q, want %q",
					tt.labels, tt.groupBy, got, tt.expected)
			}
		})
	}
}

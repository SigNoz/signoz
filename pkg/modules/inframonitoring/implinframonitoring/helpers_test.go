package implinframonitoring

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/configflagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
		{
			// deployments default group identity: (deployment, namespace).
			name: "deployment and namespace group-by",
			labels: map[string]string{
				"k8s.deployment.name": "web-1",
				"k8s.namespace.name":  "ns-x",
			},
			groupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey, namespaceNameGroupByKey},
			expected: "web-1\x00ns-x",
		},
		{
			// statefulsets default group identity: (statefulset, namespace).
			name: "statefulset and namespace group-by",
			labels: map[string]string{
				"k8s.statefulset.name": "web-1",
				"k8s.namespace.name":   "ns-x",
			},
			groupBy:  []qbtypes.GroupByKey{statefulSetNameGroupByKey, namespaceNameGroupByKey},
			expected: "web-1\x00ns-x",
		},
		{
			// jobs default group identity: (job, namespace).
			name: "job and namespace group-by",
			labels: map[string]string{
				"k8s.job.name":       "web-1",
				"k8s.namespace.name": "ns-x",
			},
			groupBy:  []qbtypes.GroupByKey{jobNameGroupByKey, namespaceNameGroupByKey},
			expected: "web-1\x00ns-x",
		},
		{
			// daemonsets default group identity: (daemonset, namespace).
			name: "daemonset and namespace group-by",
			labels: map[string]string{
				"k8s.daemonset.name": "web-1",
				"k8s.namespace.name": "ns-x",
			},
			groupBy:  []qbtypes.GroupByKey{daemonSetNameGroupByKey, namespaceNameGroupByKey},
			expected: "web-1\x00ns-x",
		},
		{
			// workload default group identity with cluster: (name, namespace, cluster).
			name: "name, namespace and cluster group-by",
			labels: map[string]string{
				"k8s.deployment.name": "web-1",
				"k8s.namespace.name":  "ns-x",
				"k8s.cluster.name":    "cluster-a",
			},
			groupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey},
			expected: "web-1\x00ns-x\x00cluster-a",
		},
		{
			// absent cluster label -> empty trailing segment (Helm-less / self-configured collector).
			name: "missing cluster label yields empty trailing segment",
			labels: map[string]string{
				"k8s.deployment.name": "web-1",
				"k8s.namespace.name":  "ns-x",
			},
			groupBy:  []qbtypes.GroupByKey{deploymentNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey},
			expected: "web-1\x00ns-x\x00",
		},
		{
			// volumes default group identity: (pvc, namespace, cluster).
			name: "pvc, namespace and cluster group-by",
			labels: map[string]string{
				"k8s.persistentvolumeclaim.name": "data-pg-0",
				"k8s.namespace.name":             "ns-x",
				"k8s.cluster.name":               "cluster-a",
			},
			groupBy:  []qbtypes.GroupByKey{pvcNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey},
			expected: "data-pg-0\x00ns-x\x00cluster-a",
		},
		{
			// absent cluster label on a PVC -> empty trailing segment.
			name: "pvc missing cluster label yields empty trailing segment",
			labels: map[string]string{
				"k8s.persistentvolumeclaim.name": "data-pg-0",
				"k8s.namespace.name":             "ns-x",
			},
			groupBy:  []qbtypes.GroupByKey{pvcNameGroupByKey, namespaceNameGroupByKey, clusterNameGroupByKey},
			expected: "data-pg-0\x00ns-x\x00",
		},
		{
			// namespaces default group identity: (namespace, cluster) — namespaces are
			// cluster-scoped, so cluster is the only cross-cluster disambiguator.
			name: "namespace and cluster group-by",
			labels: map[string]string{
				"k8s.namespace.name": "ns-x",
				"k8s.cluster.name":   "cluster-a",
			},
			groupBy:  []qbtypes.GroupByKey{namespaceNameGroupByKey, clusterNameGroupByKey},
			expected: "ns-x\x00cluster-a",
		},
		{
			// absent cluster label on a namespace -> empty trailing segment.
			name: "namespace missing cluster label yields empty trailing segment",
			labels: map[string]string{
				"k8s.namespace.name": "ns-x",
			},
			groupBy:  []qbtypes.GroupByKey{namespaceNameGroupByKey, clusterNameGroupByKey},
			expected: "ns-x\x00",
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

func TestGetPerGroupDistinctCounts(t *testing.T) {
	tests := []struct {
		name       string
		groupByCol string
		groupValue string
		wantCounts map[string]int64
	}{
		{
			// clusters API grouped by a counted attr: the groupBy alias and the
			// count alias would collide without the __count_ prefix (CH error 179).
			name:       "group-by overlaps counted attr",
			groupByCol: inframonitoringtypes.NodeNameAttrKey,
			groupValue: "node-1",
		},
		{
			name:       "group-by disjoint from counted attrs",
			groupByCol: inframonitoringtypes.ClusterNameAttrKey,
			groupValue: "cluster-a",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var (
				capturedSQL string
				orgID       = valuer.GenerateUUID()
			)

			matcher := sqlmock.QueryMatcherFunc(func(_, actualSQL string) error {
				capturedSQL = actualSQL
				return nil
			})
			ts := telemetrystoretest.New(telemetrystore.Config{}, matcher)

			md := telemetrytypestest.NewMockMetadataStore()
			md.KeysMap[tt.groupByCol] = []*telemetrytypes.TelemetryFieldKey{
				{
					Name:          tt.groupByCol,
					Signal:        telemetrytypes.SignalMetrics,
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			}

			registry := flagger.MustNewRegistry()
			fl, err := flagger.New(
				context.Background(),
				instrumentationtest.New().ToProviderSettings(),
				flagger.Config{},
				registry,
				configflagger.NewFactory(registry),
			)
			require.NoError(t, err)

			fieldMapper := metricstelemetryschema.NewFieldMapper()
			m := &module{
				telemetryStore:         ts,
				telemetryMetadataStore: md,
				fieldMapper:            fieldMapper,
				condBuilder:            metricstelemetryschema.NewConditionBuilder(fieldMapper),
				logger:                 instrumentationtest.New().Logger(),
				fl:                     fl,
			}

			cols := []cmock.ColumnType{{Name: tt.groupByCol, Type: "String"}}
			row := []any{tt.groupValue}
			wantCounts := make(map[string]int64, len(clusterCountAttrKeys))
			for i, attr := range clusterCountAttrKeys {
				cols = append(cols, cmock.ColumnType{Name: fmt.Sprintf("__count_%s", attr), Type: "UInt64"})
				row = append(row, uint64(i+1))
				wantCounts[attr] = int64(i + 1)
			}
			// cmock enforces the bound-arg count even with nil wildcards; mirror
			// the builder's placeholder count: groupBy extract + per-attr tuple
			// vars + the != '' guard + metric IN lists (outer + fingerprint
			// subquery) + 4 time bounds + the one page-group IN value.
			argCount := 1
			for _, attr := range clusterCountAttrKeys {
				if tuple, ok := countAttrIdentityTuples[attr]; ok {
					argCount += len(tuple) + 1
				} else {
					argCount += 2
				}
			}
			argCount += 2*len(clusterMetricNamesListForCounts) + 4 + 1

			ts.Mock().ExpectQuery("").
				WithArgs(make([]any, argCount)...).
				WillReturnRows(cmock.NewRows(cols, [][]any{row}))

			result, err := m.getPerGroupDistinctCounts(
				context.Background(),
				orgID,
				1700000000000,
				1700003600000,
				nil,
				[]qbtypes.GroupByKey{groupByKey(tt.groupByCol)},
				[]map[string]string{{tt.groupByCol: tt.groupValue}},
				clusterCountAttrKeys,
				clusterMetricNamesListForCounts,
			)
			require.NoError(t, err)

			// Every counted attr must be aliased into the __count_ namespace, and
			// the groupBy alias must stay unique in the SELECT list.
			for _, attr := range clusterCountAttrKeys {
				assert.Contains(t, capturedSQL, fmt.Sprintf("AS `__count_%s`", attr))
			}
			assert.Equal(t, 1, strings.Count(capturedSQL, fmt.Sprintf("AS `%s`", tt.groupByCol)))
			assert.Equal(t, map[string]map[string]int64{tt.groupValue: wantCounts}, result)
			assert.NoError(t, ts.Mock().ExpectationsWereMet())
		})
	}
}

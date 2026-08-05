package implinframonitoring

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/stretchr/testify/require"
)

// Component used across splitBucket cases — it's a processor so the test
// doesn't carry any receiver semantics.
var testComponent = inframonitoringtypes.AssociatedComponent{
	Type: inframonitoringtypes.CheckComponentTypeReceiver,
	Name: "testreceiver",
}

const testDocLink = "https://example.com/docs"

func TestSplitBucket(t *testing.T) {
	type want struct {
		presentDefault  []string
		presentOptional []string
		presentAttrs    []string
		missingDefault  []string
		missingOptional []string
		missingAttrs    []string
	}

	tests := []struct {
		name           string
		bucket         checkComponentBucket
		missingMetrics map[string]bool
		missingAttrs   map[string]bool
		want           want
	}{
		{
			name:           "empty bucket — nothing to emit",
			bucket:         checkComponentBucket{Component: testComponent, DocumentationLink: testDocLink},
			missingMetrics: map[string]bool{},
			missingAttrs:   map[string]bool{},
			want:           want{},
		},
		{
			name: "all default metrics present",
			bucket: checkComponentBucket{
				Component:         testComponent,
				DefaultMetrics:    []string{"m1", "m2"},
				DocumentationLink: testDocLink,
			},
			missingMetrics: map[string]bool{},
			missingAttrs:   map[string]bool{},
			want: want{
				presentDefault: []string{"m1", "m2"},
			},
		},
		{
			name: "all default metrics missing",
			bucket: checkComponentBucket{
				Component:         testComponent,
				DefaultMetrics:    []string{"m1", "m2"},
				DocumentationLink: testDocLink,
			},
			missingMetrics: map[string]bool{"m1": true, "m2": true},
			missingAttrs:   map[string]bool{},
			want: want{
				missingDefault: []string{"m1", "m2"},
			},
		},
		{
			name: "mixed default metrics",
			bucket: checkComponentBucket{
				Component:         testComponent,
				DefaultMetrics:    []string{"m1", "m2", "m3"},
				DocumentationLink: testDocLink,
			},
			missingMetrics: map[string]bool{"m2": true},
			missingAttrs:   map[string]bool{},
			want: want{
				presentDefault: []string{"m1", "m3"},
				missingDefault: []string{"m2"},
			},
		},
		{
			name: "only optional metrics — all missing",
			bucket: checkComponentBucket{
				Component:         testComponent,
				OptionalMetrics:   []string{"opt1", "opt2"},
				DocumentationLink: testDocLink,
			},
			missingMetrics: map[string]bool{"opt1": true, "opt2": true},
			missingAttrs:   map[string]bool{},
			want: want{
				missingOptional: []string{"opt1", "opt2"},
			},
		},
		{
			name: "only required attrs — all present",
			bucket: checkComponentBucket{
				Component:         testComponent,
				RequiredAttrs:     []string{"a1", "a2"},
				DocumentationLink: testDocLink,
			},
			missingMetrics: map[string]bool{},
			missingAttrs:   map[string]bool{},
			want: want{
				presentAttrs: []string{"a1", "a2"},
			},
		},
		{
			name: "only required attrs — all missing",
			bucket: checkComponentBucket{
				Component:         testComponent,
				RequiredAttrs:     []string{"a1"},
				DocumentationLink: testDocLink,
			},
			missingMetrics: map[string]bool{},
			missingAttrs:   map[string]bool{"a1": true},
			want: want{
				missingAttrs: []string{"a1"},
			},
		},
		{
			name: "every dimension populated on both sides",
			bucket: checkComponentBucket{
				Component:         testComponent,
				DefaultMetrics:    []string{"d1", "d2"},
				OptionalMetrics:   []string{"o1", "o2"},
				RequiredAttrs:     []string{"a1", "a2"},
				DocumentationLink: testDocLink,
			},
			missingMetrics: map[string]bool{"d2": true, "o1": true},
			missingAttrs:   map[string]bool{"a2": true},
			want: want{
				presentDefault:  []string{"d1"},
				missingDefault:  []string{"d2"},
				presentOptional: []string{"o2"},
				missingOptional: []string{"o1"},
				presentAttrs:    []string{"a1"},
				missingAttrs:    []string{"a2"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := splitBucket(tt.bucket, tt.missingMetrics, tt.missingAttrs)

			requireMetricsEntry(t, "presentDefault", got.PresentDefault, tt.want.presentDefault)
			requireMetricsEntry(t, "presentOptional", got.PresentOptional, tt.want.presentOptional)
			requireAttrsEntry(t, "presentAttrs", got.PresentAttrs, tt.want.presentAttrs)

			requireMissingMetrics(t, "missingDefault", got.MissingDefault, tt.want.missingDefault)
			requireMissingMetrics(t, "missingOptional", got.MissingOptional, tt.want.missingOptional)
			requireMissingAttrs(t, "missingAttrs", got.MissingAttrs, tt.want.missingAttrs)
		})
	}
}

func TestPartitionList(t *testing.T) {
	present, missing := partitionList(
		[]string{"a", "b", "c", "d"},
		map[string]bool{"b": true, "d": true},
	)
	require.Equal(t, []string{"a", "c"}, present)
	require.Equal(t, []string{"b", "d"}, missing)
}

func TestMissingMessageTemplates(t *testing.T) {
	require.Equal(t,
		"Missing default metrics m1, m2 from comp. Learn how to configure here.",
		buildMissingDefaultMetricsMessage([]string{"m1", "m2"}, "comp"),
	)
	require.Equal(t,
		"Missing optional metrics m1 from comp. Learn how to enable here.",
		buildMissingOptionalMetricsMessage([]string{"m1"}, "comp"),
	)
	require.Equal(t,
		"Missing required attributes a1 from comp. Learn how to configure here.",
		buildMissingRequiredAttrsMessage([]string{"a1"}, "comp"),
	)
	require.Equal(t,
		"Missing required attributes a1, a2 from comp. Learn how to configure here.",
		buildMissingRequiredAttrsMessage([]string{"a1", "a2"}, "comp"),
	)
}

// TestChecksSpecs_CoverAllTypes ensures the spec map has an entry for
// every CheckType — prevents silently shipping an checks type that
// has no spec and would 500 at runtime.
func TestChecksSpecs_CoverAllTypes(t *testing.T) {
	for _, tp := range inframonitoringtypes.ValidCheckTypes {
		_, ok := checkSpecs[tp]
		require.True(t, ok, "missing checks spec for type %s", tp)
	}
	require.Len(t, checkSpecs, len(inframonitoringtypes.ValidCheckTypes))
}

// --- helpers ---

func requireMetricsEntry(t *testing.T, name string, got *inframonitoringtypes.MetricsComponentEntry, wantMetrics []string) {
	t.Helper()
	if len(wantMetrics) == 0 {
		require.Nil(t, got, name)
		return
	}
	require.NotNil(t, got, name)
	require.Equal(t, wantMetrics, got.Metrics, name)
	require.Equal(t, testComponent, got.AssociatedComponent, name)
}

func requireAttrsEntry(t *testing.T, name string, got *inframonitoringtypes.AttributesComponentEntry, wantAttrs []string) {
	t.Helper()
	if len(wantAttrs) == 0 {
		require.Nil(t, got, name)
		return
	}
	require.NotNil(t, got, name)
	require.Equal(t, wantAttrs, got.Attributes, name)
	require.Equal(t, testComponent, got.AssociatedComponent, name)
}

func requireMissingMetrics(t *testing.T, name string, got *inframonitoringtypes.MissingMetricsComponentEntry, wantMetrics []string) {
	t.Helper()
	if len(wantMetrics) == 0 {
		require.Nil(t, got, name)
		return
	}
	require.NotNil(t, got, name)
	require.Equal(t, wantMetrics, got.Metrics, name)
	require.Equal(t, testComponent, got.AssociatedComponent, name)
	require.NotEmpty(t, got.Message, name)
	require.Equal(t, testDocLink, got.DocumentationLink, name)
}

func requireMissingAttrs(t *testing.T, name string, got *inframonitoringtypes.MissingAttributesComponentEntry, wantAttrs []string) {
	t.Helper()
	if len(wantAttrs) == 0 {
		require.Nil(t, got, name)
		return
	}
	require.NotNil(t, got, name)
	require.Equal(t, wantAttrs, got.Attributes, name)
	require.Equal(t, testComponent, got.AssociatedComponent, name)
	require.NotEmpty(t, got.Message, name)
	require.Equal(t, testDocLink, got.DocumentationLink, name)
}

package implinframonitoring

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/stretchr/testify/require"
)

// Component used across splitBucket cases — it's a processor so the test
// doesn't carry any receiver semantics.
var testComponent = inframonitoringtypes.AssociatedComponent{
	Type: inframonitoringtypes.OnboardingComponentTypeReceiver,
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
		bucket         onboardingComponentBucket
		missingMetrics map[string]bool
		missingAttrs   map[string]bool
		want           want
	}{
		{
			name:           "empty bucket — nothing to emit",
			bucket:         onboardingComponentBucket{Component: testComponent, DocumentationLink: testDocLink},
			missingMetrics: map[string]bool{},
			missingAttrs:   map[string]bool{},
			want:           want{},
		},
		{
			name: "all default metrics present",
			bucket: onboardingComponentBucket{
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
			bucket: onboardingComponentBucket{
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
			bucket: onboardingComponentBucket{
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
			bucket: onboardingComponentBucket{
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
			bucket: onboardingComponentBucket{
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
			bucket: onboardingComponentBucket{
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
			bucket: onboardingComponentBucket{
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

			requireMetricsEntry(t, "presentDefault", got.PresentDefault, tt.want.presentDefault, false)
			requireMetricsEntry(t, "presentOptional", got.PresentOptional, tt.want.presentOptional, false)
			requireAttrsEntry(t, "presentAttrs", got.PresentAttrs, tt.want.presentAttrs, false)

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

// TestOnboardingSpecs_CoverAllTypes ensures the spec map has an entry for
// every OnboardingType — prevents silently shipping an onboarding type that
// has no spec and would 500 at runtime.
func TestOnboardingSpecs_CoverAllTypes(t *testing.T) {
	for _, tp := range inframonitoringtypes.ValidOnboardingTypes {
		_, ok := onboardingSpecs[tp]
		require.True(t, ok, "missing onboarding spec for type %s", tp)
	}
	require.Len(t, onboardingSpecs, len(inframonitoringtypes.ValidOnboardingTypes))
}

// --- helpers ---

func requireMetricsEntry(t *testing.T, name string, got *inframonitoringtypes.MetricsComponentEntry, wantMetrics []string, _ bool) {
	t.Helper()
	if len(wantMetrics) == 0 {
		require.Nil(t, got, name)
		return
	}
	require.NotNil(t, got, name)
	require.Equal(t, wantMetrics, got.Metrics, name)
	require.Equal(t, testComponent, got.AssociatedComponent, name)
}

func requireAttrsEntry(t *testing.T, name string, got *inframonitoringtypes.AttributesComponentEntry, wantAttrs []string, _ bool) {
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

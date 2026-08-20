package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSchemaDecoderRejectsUnsupportedSection(t *testing.T) {
	var schema schemaFile
	err := decodeKnownFields([]byte(`
versions:
  1.0.0:
    span_events:
      changes:
        - rename_events:
            event_map:
              old: current
`), &schema)

	assert.ErrorContains(t, err, "field span_events not found", "unsupported schema sections must fail generation")
}

func TestBuildFamiliesRejectsMalformedSchemaVersion(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  latest:
    spans:
      changes: []
`), &schema), "test schema must decode")

	_, err := buildFamilies([]schemaFile{schema}, overlayFile{})
	assert.ErrorContains(t, err, `schema version "latest"`, "malformed versions must not be silently reordered")
}

func TestParseSchemaVersionRejectsNonNumericComponent(t *testing.T) {
	_, err := parseSchemaVersion("1.2.x")
	assert.ErrorContains(t, err, `invalid numeric component "x"`, "non-numeric version components must fail generation")
}

func TestBuildFamiliesResolvesRenameChain(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  4.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              a: b
  3.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              b: c
              x: c
  2.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              a: b
        - rename_attributes:
            attribute_map:
              a: b
`), &schema), "test schema must decode")

	enabled := true
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"c": {Enabled: &enabled},
	}})
	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "c",
		Kind:    kindAttribute,
		Members: []generatedMember{
			{Name: "b", Contexts: []string{"attribute"}, Signals: []string{"traces"}},
			{Name: "x", Contexts: []string{"attribute"}, Signals: []string{"traces"}},
			{Name: "a", Contexts: []string{"attribute"}, Signals: []string{"traces"}},
		},
	}}, families, "predecessors should be ordered by distance and then name")
}

func TestBuildFamiliesMapsSchemaSectionsToScopes(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    all:
      changes:
        - rename_attributes:
            attribute_map:
              all.old: all.current
    resources:
      changes:
        - rename_attributes:
            attribute_map:
              resource.old: resource.current
    logs:
      changes:
        - rename_attributes:
            attribute_map:
              log.old: log.current
    metrics:
      changes:
        - rename_attributes:
            attribute_map:
              state: cpu.mode
            apply_to_metrics: [system.cpu.time]
        - rename_metrics:
            old.metric: current.metric
`), &schema), "test schema must decode")

	enabled := true
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"all.current":      {Enabled: &enabled},
		"resource.current": {Enabled: &enabled},
		"log.current":      {Enabled: &enabled},
		"cpu.mode":         {Enabled: &enabled},
		"current.metric":   {Enabled: &enabled, Kind: kindMetric},
	}})
	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{
		{
			Current: "all.current", Kind: kindAttribute,
			Members: []generatedMember{{Name: "all.old"}},
		},
		{
			Current: "cpu.mode", Kind: kindAttribute,
			Members: []generatedMember{{
				Name: "state", Contexts: []string{"attribute"}, Signals: []string{"metrics"},
				ApplyToMetrics: []string{"system.cpu.time"},
			}},
		},
		{
			Current: "current.metric", Kind: kindMetric,
			Members: []generatedMember{{Name: "old.metric", Contexts: []string{"metric"}, Signals: []string{"metrics"}}},
		},
		{
			Current: "log.current", Kind: kindAttribute,
			Members: []generatedMember{{Name: "log.old", Contexts: []string{"attribute"}, Signals: []string{"logs"}}},
		},
		{
			Current: "resource.current", Kind: kindAttribute,
			Members: []generatedMember{{Name: "resource.old", Contexts: []string{"resource"}}},
		},
	}, families, "schema sections should produce their documented per-member signal and context scopes")
}

func TestBuildFamiliesKeepsFanOutSeparate(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  2.0.0:
    metrics:
      changes:
        - rename_attributes:
            attribute_map:
              state: cpu.mode
            apply_to_metrics: [system.cpu.time]
  1.0.0:
    metrics:
      changes:
        - rename_attributes:
            attribute_map:
              state: db.client.connection.state
            apply_to_metrics: [db.client.connections.usage]
`), &schema), "test schema must decode")

	families, err := buildFamilies([]schemaFile{schema}, overlayFile{DefaultEnabled: true})
	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{
		{
			Current: "cpu.mode", Kind: kindAttribute,
			Members: []generatedMember{{
				Name: "state", Contexts: []string{"attribute"}, Signals: []string{"metrics"},
				ApplyToMetrics: []string{"system.cpu.time"},
			}},
		},
		{
			Current: "db.client.connection.state", Kind: kindAttribute,
			Members: []generatedMember{{
				Name: "state", Contexts: []string{"attribute"}, Signals: []string{"metrics"},
				ApplyToMetrics: []string{"db.client.connections.usage"},
			}},
		},
	}, families, "an old name with differently scoped rename targets must keep one membership per target")
}

func TestBuildFamiliesKeepsUnscopedRenameUnscoped(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  2.0.0:
    metrics:
      changes:
        - rename_attributes:
            attribute_map:
              direction: network.io.direction
            apply_to_metrics: [system.disk.io, system.disk.merged]
  1.0.0:
    metrics:
      changes:
        - rename_attributes:
            attribute_map:
              system.network.io.direction: network.io.direction
`), &schema), "test schema must decode")

	families, err := buildFamilies([]schemaFile{schema}, overlayFile{DefaultEnabled: true})
	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "network.io.direction", Kind: kindAttribute,
		Members: []generatedMember{
			{Name: "direction", Contexts: []string{"attribute"}, Signals: []string{"metrics"}, ApplyToMetrics: []string{"system.disk.io", "system.disk.merged"}},
			{Name: "system.network.io.direction", Contexts: []string{"attribute"}, Signals: []string{"metrics"}},
		},
	}}, families, "a rename without apply_to_metrics stays unbounded; a scoped sibling must not bound it")
}

func TestBuildFamiliesKeepsMemberScopesThroughChains(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  2.0.0:
    metrics:
      changes:
        - rename_attributes:
            attribute_map:
              messaging.client_id: messaging.client.id
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              messaging.kafka.client_id: messaging.client_id
`), &schema), "test schema must decode")

	families, err := buildFamilies([]schemaFile{schema}, overlayFile{DefaultEnabled: true})
	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "messaging.client.id", Kind: kindAttribute,
		Members: []generatedMember{
			{Name: "messaging.client_id", Contexts: []string{"attribute"}, Signals: []string{"metrics"}},
			{Name: "messaging.kafka.client_id", Contexts: []string{"attribute"}, Signals: []string{"traces"}},
		},
	}}, families, "a member keeps the scope of its own rename edge; later hops only carry it to the root")
}

func TestBuildFamiliesRecordsCrossContextMembersSeparately(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              http.user_agent: user_agent.original
    resources:
      changes:
        - rename_attributes:
            attribute_map:
              browser.user_agent: user_agent.original
`), &schema), "test schema must decode")

	families, err := buildFamilies([]schemaFile{schema}, overlayFile{DefaultEnabled: true})
	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "user_agent.original", Kind: kindAttribute,
		Members: []generatedMember{
			{Name: "browser.user_agent", Contexts: []string{"resource"}},
			{Name: "http.user_agent", Contexts: []string{"attribute"}, Signals: []string{"traces"}},
		},
	}}, families, "members renamed from different contexts must keep their own context scopes")
}

func TestBuildFamiliesMergesRepeatedEdgeScopes(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  2.0.0:
    logs:
      changes:
        - rename_attributes:
            attribute_map:
              old: current
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              old: current
`), &schema), "test schema must decode")

	families, err := buildFamilies([]schemaFile{schema}, overlayFile{DefaultEnabled: true})
	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "current", Kind: kindAttribute,
		Members: []generatedMember{
			{Name: "old", Contexts: []string{"attribute"}, Signals: []string{"logs", "traces"}},
		},
	}}, families, "the same rename filed under several sections widens the member scope")
}

func TestOverlayAddsFamilyWithoutSchemaHistory(t *testing.T) {
	enabled := true
	families, err := buildFamilies(nil, overlayFile{Families: map[string]overlayFamily{
		"added.current": {
			Enabled:  &enabled,
			Old:      []string{"added.old"},
			Contexts: []string{"resource"},
			Signals:  []string{"traces"},
		},
	}})

	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current:  "added.current",
		Kind:     kindAttribute,
		Members:  []generatedMember{{Name: "added.old"}},
		Contexts: []string{"resource"},
		Signals:  []string{"traces"},
	}}, families, "an explicit overlay family should not require schema history")
}

func TestOverlayOverridesGeneratedFamily(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              old: current
`), &schema), "test schema must decode")

	enabled := true
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"current": {
			Enabled:    &enabled,
			AddOld:     []string{"older"},
			ExcludeOld: []string{"old"},
			AddSignals: []string{"logs"},
			ValueMap:   map[string]string{"legacy": "current"},
		},
	}})

	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current:  "current",
		Kind:     kindAttribute,
		Members:  []generatedMember{{Name: "older"}},
		ValueMap: map[string]string{"legacy": "current"},
	}}, families, "overlay additions and exclusions should be applied to the generated family")
}

func TestOverlayAddSignalsWidensMemberScopes(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              old: current
`), &schema), "test schema must decode")

	enabled := true
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"current": {Enabled: &enabled, AddSignals: []string{"logs"}},
	}})

	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "current",
		Kind:    kindAttribute,
		Members: []generatedMember{
			{Name: "old", Contexts: []string{"attribute"}, Signals: []string{"logs", "traces"}},
		},
	}}, families, "add_signals widens the schema-derived member scopes and never narrows the family gate")
}

func TestOverlaySignalsSetTheFamilyGate(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    all:
      changes:
        - rename_attributes:
            attribute_map:
              old: current
`), &schema), "test schema must decode")

	enabled := true
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"current": {Enabled: &enabled, Signals: []string{"logs", "traces"}},
	}})

	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "current",
		Kind:    kindAttribute,
		Members: []generatedMember{{Name: "old"}},
		Signals: []string{"logs", "traces"},
	}}, families, "the overlay signals list gates the family without touching member scopes")
}

func TestOverlayDisablesFamilyWhenDefaultIsEnabled(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              old: current
`), &schema), "test schema must decode")

	disabled := false
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{
		DefaultEnabled: true,
		Families: map[string]overlayFamily{
			"current": {Enabled: &disabled},
		},
	})

	require.NoError(t, err)
	assert.Empty(t, families, "an explicitly disabled family must override default_enabled")
}

func TestRenderGoIsDeterministic(t *testing.T) {
	families := []generatedFamily{{
		Current: "current", Kind: kindAttribute,
		Members:  []generatedMember{{Name: "old"}},
		ValueMap: map[string]string{"b": "2", "a": "1"},
	}}

	first, err := renderGo(families)
	require.NoError(t, err)
	second, err := renderGo(families)
	require.NoError(t, err)
	assert.Equal(t, first, second, "Go generation must not depend on map iteration order")
}

func TestRenderGoUsesCanonicalTelemetryTypes(t *testing.T) {
	families := []generatedFamily{{
		Current: "current", Kind: kindAttribute,
		Members: []generatedMember{{Name: "old", Contexts: []string{"resource"}, Signals: []string{"traces"}}},
	}}

	output, err := renderGo(families)
	require.NoError(t, err)
	assert.Contains(t, string(output), "telemetrytypes.FieldContextResource", "generated contexts should use telemetrytypes")
	assert.Contains(t, string(output), "telemetrytypes.SignalTraces", "generated signals should use telemetrytypes")
}

func TestRenderGoRejectsUnknownContext(t *testing.T) {
	families := []generatedFamily{{
		Current: "current", Kind: kindAttribute,
		Members: []generatedMember{{Name: "old", Contexts: []string{"bogus"}}},
	}}

	_, err := renderGo(families)
	assert.ErrorContains(t, err, `unsupported field context "bogus"`, "a bad overlay context must fail generation, not compile")
}

func TestRenderGoRejectsUnknownSignal(t *testing.T) {
	families := []generatedFamily{{
		Current: "current", Kind: kindAttribute,
		Members: []generatedMember{{Name: "old"}},
		Signals: []string{"bogus"},
	}}

	_, err := renderGo(families)
	assert.ErrorContains(t, err, `unsupported signal "bogus"`, "a bad overlay signal must fail generation, not compile")
}

func TestRenderGoPinsOutput(t *testing.T) {
	families := []generatedFamily{{
		Current: "deployment.environment.name", Kind: kindAttribute,
		Members: []generatedMember{{Name: "deployment.environment"}},
		Signals: []string{"logs", "traces"},
	}}

	output, err := renderGo(families)
	require.NoError(t, err)
	assert.Equal(t, `// Code generated by scripts/semconv. DO NOT EDIT.

package semconv

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

var families = []Family{
	{
		current: "deployment.environment.name",
		kind:    KindAttribute,
		members: []Member{
			{name: "deployment.environment"},
		},
		signals: []telemetrytypes.Signal{telemetrytypes.SignalLogs, telemetrytypes.SignalTraces},
	},
}
`, string(output), "the emitted Go text is a contract; regeneration must be reviewable")
}

func TestRenderTypeScriptIsDeterministic(t *testing.T) {
	families := []generatedFamily{{
		Current: "current", Kind: kindAttribute,
		Members:  []generatedMember{{Name: "old"}},
		ValueMap: map[string]string{"b": "2", "a": "1"},
	}}

	assert.Equal(t, renderTypeScript(families), renderTypeScript(families), "TypeScript generation must not depend on map iteration order")
}

func TestRenderTypeScriptPinsOutput(t *testing.T) {
	families := []generatedFamily{{
		Current: "deployment.environment.name", Kind: kindAttribute,
		Members: []generatedMember{{Name: "deployment.environment"}},
		Signals: []string{"logs", "traces"},
	}}

	assert.Equal(t, `// Code generated by scripts/semconv. DO NOT EDIT.

// An empty contexts/signals/applyToMetrics array places no constraint on
// that axis.
export type SemconvMember = {
	readonly name: string;
	readonly contexts: readonly string[];
	readonly signals: readonly string[];
	readonly applyToMetrics: readonly string[];
};

export type SemconvFamily = {
	readonly current: string;
	readonly kind: 'attribute' | 'metric';
	readonly members: readonly SemconvMember[];
	readonly contexts: readonly string[];
	readonly signals: readonly string[];
	readonly valueMap: Readonly<Record<string, string>>;
};

export const SEMCONV_FAMILIES: readonly SemconvFamily[] = [
	{
		current: 'deployment.environment.name',
		kind: 'attribute',
		members: [
			{ name: 'deployment.environment', contexts: [], signals: [], applyToMetrics: [] },
		],
		contexts: [],
		signals: ['logs', 'traces'],
		valueMap: {},
	},
] as const;
`, string(renderTypeScript(families)), "the emitted TypeScript text is a contract; regeneration must be reviewable")
}

func TestBuildFamiliesHandlesRenameRollback(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  2.0.0:
    metrics:
      changes:
        - rename_metrics:
            temporary: original
  1.0.0:
    metrics:
      changes:
        - rename_metrics:
            original: temporary
`), &schema), "test schema must decode")

	enabled := true
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"original": {Enabled: &enabled, Kind: kindMetric},
	}})

	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "original",
		Kind:    kindMetric,
		Members: []generatedMember{{Name: "temporary", Contexts: []string{"metric"}, Signals: []string{"metrics"}}},
	}}, families, "the latest rollback destination should remain the family root")
}

func TestBuildFamiliesRejectsSameVersionRenameChain(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              x: y
              y: z
`), &schema), "test schema must decode")

	_, err := buildFamilies([]schemaFile{schema}, overlayFile{})
	assert.ErrorContains(t, err, `same-version attribute rename chain through "y"`, "order-sensitive same-version chains must be rejected")
}

func TestBuildFamiliesRejectsOverlayFamilyWithoutHistory(t *testing.T) {
	enabled := true
	_, err := buildFamilies(nil, overlayFile{Families: map[string]overlayFamily{
		"missing": {Enabled: &enabled},
	}})

	assert.ErrorContains(t, err, `overlay family "missing" with kind "attribute" is absent`, "an overlay cannot invent a family without old members")
}

func TestBuildFamiliesRejectsEnabledFamilyWithoutOldMembers(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              old: current
`), &schema), "test schema must decode")

	enabled := true
	_, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"current": {Enabled: &enabled, ExcludeOld: []string{"old"}},
	}})
	assert.ErrorContains(t, err, `enabled family "current" with kind "attribute" has no old members`, "exclude_old cannot empty an enabled family")
}

func TestOverlayKindDefaultsToAttribute(t *testing.T) {
	var schema schemaFile
	require.NoError(t, decodeKnownFields([]byte(`
versions:
  1.0.0:
    spans:
      changes:
        - rename_attributes:
            attribute_map:
              attribute.old: shared.current
    metrics:
      changes:
        - rename_metrics:
            metric.old: shared.current
`), &schema), "test schema must decode")

	enabled := true
	families, err := buildFamilies([]schemaFile{schema}, overlayFile{Families: map[string]overlayFamily{
		"shared.current": {Enabled: &enabled},
	}})

	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current: "shared.current",
		Kind:    kindAttribute,
		Members: []generatedMember{{Name: "attribute.old", Contexts: []string{"attribute"}, Signals: []string{"traces"}}},
	}}, families, "a kind-less overlay policy should affect only the attribute family")
}

func TestCheckFileReportsStaleOutput(t *testing.T) {
	path := filepath.Join(t.TempDir(), "generated.go")
	require.NoError(t, os.WriteFile(path, []byte("old"), 0o600), "test output must be writable")

	assert.ErrorContains(t, checkFile(path, []byte("new")), "is stale", "check mode must reject stale generated output")
}

func TestTypeScriptStringEscapesControlCharacters(t *testing.T) {
	assert.Equal(t, `'line\n\t\x01\'\\end'`, tsString("line\n\t\x01'\\end"), "generated TypeScript strings must remain valid literals")
}

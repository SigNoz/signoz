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
		Current:  "c",
		Old:      []string{"b", "x", "a"},
		Kind:     kindAttribute,
		Contexts: []string{"attribute"},
		Signals:  []string{"traces"},
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
			Current: "all.current", Old: []string{"all.old"}, Kind: kindAttribute,
			Contexts: nil, Signals: nil,
		},
		{
			Current: "cpu.mode", Old: []string{"state"}, Kind: kindAttribute,
			Contexts: []string{"attribute"}, Signals: []string{"metrics"},
			ApplyToMetrics: []string{"system.cpu.time"},
		},
		{
			Current: "current.metric", Old: []string{"old.metric"}, Kind: kindMetric,
			Contexts: []string{"metric"}, Signals: []string{"metrics"},
		},
		{
			Current: "log.current", Old: []string{"log.old"}, Kind: kindAttribute,
			Contexts: []string{"attribute"}, Signals: []string{"logs"},
		},
		{
			Current: "resource.current", Old: []string{"resource.old"}, Kind: kindAttribute,
			Contexts: []string{"resource"},
		},
	}, families, "schema sections should produce their documented signal and context scopes")
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
		Old:      []string{"added.old"},
		Kind:     kindAttribute,
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
			Enabled:     &enabled,
			AddOld:      []string{"older"},
			ExcludeOld:  []string{"old"},
			AddContexts: []string{"resource"},
			AddSignals:  []string{"logs"},
			ValueMap:    map[string]string{"legacy": "current"},
		},
	}})

	require.NoError(t, err)
	assert.Equal(t, []generatedFamily{{
		Current:  "current",
		Old:      []string{"older"},
		Kind:     kindAttribute,
		Contexts: []string{"attribute", "resource"},
		Signals:  []string{"logs", "traces"},
		ValueMap: map[string]string{"legacy": "current"},
	}}, families, "overlay additions and exclusions should be applied to the generated family")
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
		Current: "current", Old: []string{"old"}, Kind: kindAttribute,
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
		Current: "current", Old: []string{"old"}, Kind: kindAttribute,
		Contexts: []string{"resource"}, Signals: []string{"traces"},
	}}

	output, err := renderGo(families)
	require.NoError(t, err)
	assert.Contains(t, string(output), "telemetrytypes.FieldContextResource", "generated contexts should use telemetrytypes")
	assert.Contains(t, string(output), "telemetrytypes.SignalTraces", "generated signals should use telemetrytypes")
}

func TestRenderTypeScriptIsDeterministic(t *testing.T) {
	families := []generatedFamily{{
		Current: "current", Old: []string{"old"}, Kind: kindAttribute,
		ValueMap: map[string]string{"b": "2", "a": "1"},
	}}

	assert.Equal(t, renderTypeScript(families), renderTypeScript(families), "TypeScript generation must not depend on map iteration order")
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
		Current:  "original",
		Old:      []string{"temporary"},
		Kind:     kindMetric,
		Contexts: []string{"metric"},
		Signals:  []string{"metrics"},
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
		Current:  "shared.current",
		Old:      []string{"attribute.old"},
		Kind:     kindAttribute,
		Contexts: []string{"attribute"},
		Signals:  []string{"traces"},
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

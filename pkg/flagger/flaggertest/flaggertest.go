// Package flaggertest provides helpers for creating Flagger instances in tests.
package flaggertest

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/configflagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/stretchr/testify/require"
)

// New returns a Flagger with all flags at their registry defaults (all disabled).
// Use this in tests that do not need any feature flag enabled.
func New(t *testing.T) flagger.Flagger {
	t.Helper()
	registry := flagger.MustNewRegistry()
	fl, err := flagger.New(
		context.Background(),
		instrumentationtest.New().ToProviderSettings(),
		flagger.Config{},
		registry,
		configflagger.NewFactory(registry),
	)
	require.NoError(t, err)
	return fl
}

// WithUseJSONBody returns a Flagger with use_json_body set to the given value.
func WithUseJSONBody(t *testing.T, enabled bool) flagger.Flagger {
	return WithBooleanFlags(t, map[string]bool{
		flagger.FeatureUseJSONBody.String(): enabled,
	})
}

// WithBooleanFlags returns a Flagger with the given boolean feature flags set to
// the provided values (keyed by feature name, e.g. flagger.FeatureX.String()).
func WithBooleanFlags(t *testing.T, flags map[string]bool) flagger.Flagger {
	t.Helper()
	registry := flagger.MustNewRegistry()
	cfg := flagger.Config{}
	if len(flags) > 0 {
		cfg.Config.Boolean = flags
	}
	fl, err := flagger.New(
		context.Background(),
		instrumentationtest.New().ToProviderSettings(),
		cfg,
		registry,
		configflagger.NewFactory(registry),
	)
	require.NoError(t, err)
	return fl
}

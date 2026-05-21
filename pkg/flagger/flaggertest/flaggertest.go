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
	t.Helper()
	registry := flagger.MustNewRegistry()
	cfg := flagger.Config{}
	if enabled {
		cfg.Config.Boolean = map[string]bool{
			flagger.FeatureUseJSONBody.String(): true,
		}
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

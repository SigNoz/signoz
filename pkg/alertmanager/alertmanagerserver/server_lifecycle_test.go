package alertmanagerserver

import (
	"context"
	"log/slog"
	"testing"

	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes/alertmanagertypestest"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/pkg/labels"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
	"go.uber.org/goleak"
)

func TestServerWorkersStopAfterConfig(t *testing.T) {
	for _, tc := range []struct {
		name    string
		reloads int
	}{
		{name: "immediate stop", reloads: 1},
		{name: "rapid reloads", reloads: 3},
	} {
		t.Run(tc.name, func(t *testing.T) {
			defer goleak.VerifyNone(t, goleak.IgnoreCurrent())
			ctx := context.Background()
			srvConfig := NewConfig()
			srvConfig.Templates = nil
			server, err := New(ctx, slog.New(slog.DiscardHandler), prometheus.NewRegistry(), srvConfig,
				"test-org", alertmanagertypestest.NewStateStore(), nfmanagertest.NewMock(), alertmanagertypestest.NewMockMaintenanceStore(t))
			require.NoError(t, err)
			defer func() { require.NoError(t, server.Stop(ctx)) }()
			require.NoError(t, server.alerts.Put(ctx, &types.Alert{Alert: model.Alert{
				Labels: model.LabelSet{"alertname": "test", "severity": "critical"},
			}}))

			for range tc.reloads {
				previousDispatcher := server.dispatcher
				previousInhibitorDone := server.inhibitorDone
				amConfig, err := alertmanagertypes.NewDefaultConfig(srvConfig.Global, srvConfig.Route, "test-org")
				require.NoError(t, err)
				amConfig.AlertmanagerConfig().InhibitRules = []config.InhibitRule{{
					SourceMatchers: config.Matchers{{Type: labels.MatchEqual, Name: "severity", Value: "critical"}},
					TargetMatchers: config.Matchers{{Type: labels.MatchEqual, Name: "severity", Value: "warning"}},
					Equal:          []string{"alertname"},
				}}
				require.NoError(t, server.SetConfig(ctx, amConfig))
				if previousDispatcher != nil {
					select {
					case <-previousDispatcher.done:
					default:
						t.Fatal("reload returned before the old dispatcher stopped")
					}
					select {
					case <-previousInhibitorDone:
					default:
						t.Fatal("reload returned before the old inhibitor stopped")
					}
				}
			}
		})
	}
}

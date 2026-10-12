package model

import (
	"context"
	"errors"
	"log/slog"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/open-telemetry/opamp-go/server/types"
	"github.com/stretchr/testify/require"
)

type countingConfigProvider struct {
	recommendCalls int
}

func (p *countingConfigProvider) RecommendAgentConfig(valuer.UUID, []byte) ([]byte, string, error) {
	p.recommendCalls++
	return nil, "", errors.New("unexpected config recommendation")
}

func (p *countingConfigProvider) ReportConfigDeploymentStatus(valuer.UUID, string, string, error) {}

func (p *countingConfigProvider) GetDeployStatusByHash(context.Context, valuer.UUID, string) (opamptypes.DeployStatus, error) {
	return opamptypes.DeployStatus{}, nil
}

func TestRecommendLatestConfigToAllSkipsAgentsWithoutEffectiveConfig(t *testing.T) {
	// Right after the server starts, a connected agent may not have reported its
	// effective config yet. Recommending a config for it must be skipped: the
	// config providers cannot work from an empty config.
	agents := &Agents{
		agentsById: map[string]*Agent{
			"agent-without-config": {StorableAgent: opamptypes.StorableAgent{AgentID: "agent-without-config"}},
		},
		connections: map[types.Connection]map[string]bool{},
		logger:      slog.New(slog.DiscardHandler),
	}
	provider := &countingConfigProvider{}

	require.NoError(t, agents.RecommendLatestConfigToAll(provider))
	require.Zero(t, provider.recommendCalls)
}

package opamp

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// PendingDeployment is an agent config deployment still in the in_progress state.
// These are re-registered in the coordinator on server startup so that
// notifySubscribers can find them when the agent reconnects after a crash.
type PendingDeployment struct {
	OrgID valuer.UUID
	// RawConfigHash is the hash without the orgId prefix, matching the
	// ConfigHash sent in AgentRemoteConfig and reported back by the agent.
	RawConfigHash string
}

// Interface for a source of otel collector config recommendations.
type AgentConfigProvider interface {
	model.AgentConfigProvider

	// Subscribe to be notified on changes in config provided by this source.
	// Used for rolling out latest config recommendation to all connected agents when settings change
	SubscribeToConfigUpdates(callback func()) (unsubscribe func())

	// GetPendingDeployments returns all config deployments currently in_progress.
	// Called on server startup to re-register coordinator subscribers that were
	// lost when the server previously crashed or restarted.
	GetPendingDeployments(ctx context.Context) ([]PendingDeployment, error)
}

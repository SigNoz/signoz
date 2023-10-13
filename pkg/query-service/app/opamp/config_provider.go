package opamp

import "go.signoz.io/signoz/pkg/query-service/app/opamp/model"

// Interface for a source of otel collector config recommendations.
type AgentConfigProvider interface {
	model.AgentConfigProvider

	// Subscribe to be notified on changes in config provided by this source.
	// Used for rolling out latest config recommendation to all connected agents when settings change
	SubscribeToConfigUpdates(callback func()) (unsubscribe func())
}

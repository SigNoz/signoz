package opamp

import "go.signoz.io/signoz/pkg/query-service/app/opamp/model"

type AgentConfigProvider interface {
	model.AgentConfigProvider

	// Subscribe to be notified on changes in settings for agent config based features
	// Used for rolling out latest config recommendation to all connected agents when settings change
	SubscribeToConfigUpdates(callback func()) (unsubscribe func())
}

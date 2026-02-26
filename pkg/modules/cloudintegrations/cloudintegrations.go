package cloudintegrations

import (
	"context"
	"net/http"
)

// start with moving the agent functions here to get review

// type Module interface {
// 	AgentCheckIn(http.ResponseWriter, *http.Request)
// }

type Handler interface {
	AgentCheckIn(http.ResponseWriter, *http.Request)
	ListServices(http.ResponseWriter, *http.Request)
}

type Module interface {
	AgentCheckIn(ctx context.Context, req *PostableAgentCheckInPayload) (any, error)
	ListServices(ctx context.Context, orgID string, cloudProvider string, cloudAccountId *string) (any, error)
}

// store interface will be in the types package
type CloudProvider interface {
	ListServices(ctx context.Context, orgID string, cloudAccountId *string) (any, error)
}

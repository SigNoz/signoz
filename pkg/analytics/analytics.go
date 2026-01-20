package analytics

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
)

type Analytics interface {
	factory.Service

	// Sends analytics messages to an analytics backend.
	Send(context.Context, ...analyticstypes.Message)

	// Tracks an event on a group level. Input is group, event name, and attributes. The user is "stats_<org_id>".
	TrackGroup(context.Context, string, string, map[string]any)

	// Tracks an event on a user level and attributes it with the group. Input is group, user, event name, and attributes.
	TrackUser(context.Context, string, string, string, map[string]any)

	// Identifies a group. Input is group, traits.
	IdentifyGroup(context.Context, string, map[string]any)

	// Identifies a user. Input is group, user, traits.
	IdentifyUser(context.Context, string, string, map[string]any)
}

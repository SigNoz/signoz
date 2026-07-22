package alertmanagertypes

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeAtlassianConnectionNotFound = errors.MustNewCode("atlassian_connection_not_found")
	ErrCodeAtlassianConnectionInUse    = errors.MustNewCode("atlassian_connection_in_use")
)

// CloudAPIGatewayURL is the gateway through which Jira Cloud sites are addressed by cloud id.
const CloudAPIGatewayURL = "https://api.atlassian.com/ex/jira"

type AtlassianConnection struct {
	bun.BaseModel `bun:"table:atlassian_connection"`

	types.Identifiable
	types.TimeAuditable
	CloudID      string `json:"cloud_id,omitempty" bun:"cloud_id"`
	SiteURL      string `json:"site_url" bun:"site_url"`
	AccessToken  string `json:"-" bun:"access_token"`
	RefreshToken string `json:"-" bun:"refresh_token"`
	OrgID        string `json:"-" bun:"org_id"`
}

// NewAtlassianConnection builds a connection with a fresh id and timestamps.
func NewAtlassianConnection(orgID, cloudID, siteURL, accessToken, refreshToken string) *AtlassianConnection {
	now := time.Now()
	return &AtlassianConnection{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		CloudID:      cloudID,
		SiteURL:      siteURL,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		OrgID:        orgID,
	}
}

// APIBaseURL returns the REST base for issue operations, keyed by cloud id.
func (c *AtlassianConnection) APIBaseURL() string {
	return c.APIBaseURLVia(CloudAPIGatewayURL)
}

// APIBaseURLVia is APIBaseURL with the Cloud gateway host overridden.
func (c *AtlassianConnection) APIBaseURLVia(gateway string) string {
	return fmt.Sprintf("%s/%s/rest/api/3", strings.TrimRight(gateway, "/"), c.CloudID)
}

// AtlassianConnectionStore persists reusable Atlassian OAuth connections.
type AtlassianConnectionStore interface {
	// Create inserts a new connection.
	Create(context.Context, *AtlassianConnection) error

	// GetByID returns the connection for the given org and id.
	GetByID(context.Context, string, valuer.UUID) (*AtlassianConnection, error)

	// GetByOrgAndSiteURL returns the connection for an org and Atlassian site, if any.
	GetByOrgAndSiteURL(context.Context, string, string) (*AtlassianConnection, error)

	// ListByOrg returns all connections for an org.
	ListByOrg(context.Context, string) ([]*AtlassianConnection, error)

	// Update persists token (and timestamp) changes for an existing connection.
	Update(context.Context, *AtlassianConnection) error

	// DeleteByID removes a connection owned by the given org.
	DeleteByID(context.Context, string, valuer.UUID) error
}

func (receiver *Receiver) AtlassianConfigs() []AtlassianBackedConfig {
	configs := make([]AtlassianBackedConfig, 0, len(receiver.JiraConfigs))
	for _, config := range receiver.JiraConfigs {
		configs = append(configs, config)
	}

	return configs
}

type AtlassianBackedConfig interface {
	// GetConnectionID returns the id of the AtlassianConnection this config uses.
	GetConnectionID() string

	// SetOrgID stamps the runtime-only org id used to resolve live credentials.
	SetOrgID(string)

	// ChannelKind names the channel type in user-facing errors.
	ChannelKind() string
}

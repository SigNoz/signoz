package alertmanagertypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	"github.com/uptrace/bun"
)

var (
	ErrCodeAtlassianConnectionNotFound = errors.MustNewCode("atlassian_connection_not_found")
	ErrCodeAtlassianConnectionInUse    = errors.MustNewCode("atlassian_connection_in_use")
)

type JiraReceiverConfig struct {
	config.JiraConfig `yaml:",inline"`

	// ConnectionID references a persisted AtlassianConnection.
	ConnectionID string `json:"connection_id,omitempty" yaml:"connection_id,omitempty"`

	// OrgID is a runtime-only field stamped at config-load and
	// on create/update/test so the notifier can resolve live credentials from the
	// connection store for the right org on each fire.
	OrgID string `json:"-" yaml:"-"`
}

type AtlassianConnection struct {
	bun.BaseModel `bun:"table:atlassian_connection"`

	types.Identifiable
	types.TimeAuditable
	CloudID      string `json:"cloud_id" bun:"cloud_id"`
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

// AtlassianConnectionStore persists reusable Atlassian OAuth connections.
type AtlassianConnectionStore interface {
	// Create inserts a new connection.
	Create(context.Context, *AtlassianConnection) error

	// GetByID returns the connection for the given org and id.
	GetByID(context.Context, string, valuer.UUID) (*AtlassianConnection, error)

	// GetByOrgAndCloudID returns the connection for an org and Atlassian site, if any.
	GetByOrgAndCloudID(context.Context, string, string) (*AtlassianConnection, error)

	// ListByOrg returns all connections for an org.
	ListByOrg(context.Context, string) ([]*AtlassianConnection, error)

	// Update persists token (and timestamp) changes for an existing connection.
	Update(context.Context, *AtlassianConnection) error

	// UpdateTokensByRefreshToken rotates the access/refresh token of any connection
	// currently holding oldRefreshToken. Returns the number of rows updated.
	UpdateTokensByRefreshToken(ctx context.Context, oldRefreshToken, accessToken, refreshToken string) (int64, error)

	// DeleteByID removes a connection owned by the given org.
	DeleteByID(context.Context, string, valuer.UUID) error
}

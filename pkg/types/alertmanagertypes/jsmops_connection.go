package alertmanagertypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeJsmOpsConnectionNotFound = errors.MustNewCode("jsmops_connection_not_found")
	ErrCodeJsmOpsConnectionInUse    = errors.MustNewCode("jsmops_connection_in_use")
)

// JsmOpsReceiverConfig represents a JSM Ops notification configuration.
type JsmOpsReceiverConfig struct {
	ConnectionID      string   `json:"connection_id,omitempty" yaml:"connection_id,omitempty"`
	OrgID             string   `json:"-" yaml:"-"`
	Responders        []string `json:"responders,omitempty" yaml:"responders,omitempty"`
	Message           string   `json:"message" yaml:"message"`
	Description       string   `json:"description" yaml:"description"`
	Tags              []string `json:"tags,omitempty" yaml:"tags,omitempty"`
	Priority          string   `json:"priority,omitempty" yaml:"priority,omitempty"`
	SendResolvedValue bool     `json:"send_resolved" yaml:"send_resolved"`
}

// SendResolved returns whether resolved notifications should be sent.
func (c *JsmOpsReceiverConfig) SendResolved() bool {
	return c != nil && c.SendResolvedValue
}

type JsmOpsConnection struct {
	bun.BaseModel `bun:"table:jsmops_connection"`

	types.Identifiable
	types.TimeAuditable
	CloudID      string `json:"cloud_id" bun:"cloud_id"`
	SiteURL      string `json:"site_url" bun:"site_url"`
	AccessToken  string `json:"-" bun:"access_token"`
	RefreshToken string `json:"-" bun:"refresh_token"`
	OrgID        string `json:"-" bun:"org_id"`
}

// NewJsmOpsConnection builds a connection with a fresh id and timestamps.
func NewJsmOpsConnection(orgID, cloudID, siteURL, accessToken, refreshToken string) *JsmOpsConnection {
	now := time.Now()
	return &JsmOpsConnection{
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

// JsmOpsConnectionStore persists reusable JSM Ops OAuth connections.
type JsmOpsConnectionStore interface {
	// Create inserts a new connection.
	Create(context.Context, *JsmOpsConnection) error

	// GetByID returns the connection for the given org and id.
	GetByID(context.Context, string, valuer.UUID) (*JsmOpsConnection, error)

	// GetByOrgAndCloudID returns the connection for an org and Atlassian site, if any.
	GetByOrgAndCloudID(context.Context, string, string) (*JsmOpsConnection, error)

	// ListByOrg returns all connections for an org.
	ListByOrg(context.Context, string) ([]*JsmOpsConnection, error)

	// Update persists token (and timestamp) changes for an existing connection.
	Update(context.Context, *JsmOpsConnection) error

	// UpdateTokensByRefreshToken rotates the access/refresh token of any connection
	// currently holding oldRefreshToken. Returns the number of rows updated.
	UpdateTokensByRefreshToken(ctx context.Context, oldRefreshToken, accessToken, refreshToken string) (int64, error)

	// DeleteByID removes a connection owned by the given org.
	DeleteByID(context.Context, string, valuer.UUID) error
}

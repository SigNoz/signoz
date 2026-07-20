package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/config"
)

type JiraReceiverConfig struct {
	config.JiraConfig `yaml:",inline"`

	ConnectionID string `json:"connection_id,omitempty" yaml:"connection_id,omitempty"`
	OrgID        string `json:"-" yaml:"-"`
}

var _ AtlassianBackedConfig = (*JiraReceiverConfig)(nil)

// GetConnectionID returns the id of the AtlassianConnection this config uses.
func (c *JiraReceiverConfig) GetConnectionID() string { return c.ConnectionID }

// SetOrgID stamps the runtime-only org id used to resolve live credentials.
func (c *JiraReceiverConfig) SetOrgID(orgID string) { c.OrgID = orgID }

// ChannelKind names the channel type in user-facing errors.
func (c *JiraReceiverConfig) ChannelKind() string { return "Jira" }

package alertmanagertypes

import (
	"context"
	"encoding/json"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

var (
	ErrCodeAlertmanagerChannelNotFound      = errors.MustNewCode("alertmanager_channel_not_found")
	ErrCodeAlertmanagerChannelNameMismatch  = errors.MustNewCode("alertmanager_channel_name_mismatch")
	ErrCodeAlertmanagerChannelInvalid       = errors.MustNewCode("alertmanager_channel_invalid")
	ErrCodeAlertmanagerChannelAlreadyExists = errors.MustNewCode("alertmanager_channel_already_exists")
)

var (
	// Regular expression to match anything before "_configs".
	receiverTypeRegex = regexp.MustCompile(`^(.+)_configs`)
)

type Channels = []*Channel

// Channel represents a single receiver of the alertmanager config.
type Channel struct {
	bun.BaseModel `bun:"table:notification_channel"`

	types.Identifiable
	types.TimeAuditable
	// Name is the DNS1123 identity references will migrate onto. Until then
	// DisplayName is the receiver name inside Data and what policies and rules
	// reference, so it keeps the v1 wire tag and Name stays off the v1 contract.
	Name        string `json:"-" bun:"name"`
	DisplayName string `json:"name" required:"true" bun:"display_name"`
	// TODO: type this as ChannelKind once v1 is gone.
	Type  string `json:"type" required:"true" bun:"type"`
	Data  string `json:"data" required:"true" bun:"data"`
	OrgID string `json:"orgId" required:"true" bun:"org_id"`

	// Spec is the v2 spec a read returns, of the kind Type names. A v2 write
	// stores it as the caller wrote it and a v1 write derives it from the
	// defaulted receiver. Only a row the migration could not backfill has none.
	// StoredSpec is the column, written by fillSpec and decoded by AfterScanRow.
	Spec       ChannelSpec `json:"-" bun:"-"`
	StoredSpec string      `json:"-" bun:"spec,type:text,nullzero"`
}

var _ bun.AfterScanRowHook = (*Channel)(nil)

// AfterScanRow decodes the stored spec under Type, which bun cannot do column by
// column because the spec's Go type depends on it.
func (c *Channel) AfterScanRow(context.Context) error {
	if c.StoredSpec == "" {
		c.Spec = nil
		return nil
	}

	channelKind, ok := parseChannelKind(c.Type)
	if !ok {
		return errors.NewInternalf(errors.CodeInternal, "channel %q stores a spec under unmodelled type %q", c.DisplayName, c.Type)
	}

	spec, _ := buildEmptyChannelSpecForKind(channelKind)
	if err := json.Unmarshal([]byte(c.StoredSpec), spec); err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "unmarshal channel %q spec", c.DisplayName)
	}
	c.Spec = spec

	return nil
}

func (c *Channel) fillSpec(spec ChannelSpec) error {
	stored, err := json.Marshal(spec)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "marshal channel %q spec", c.DisplayName)
	}
	c.Spec, c.StoredSpec = spec, string(stored)

	return nil
}

func NewConfigFromChannels(globalConfig GlobalConfig, routeConfig RouteConfig, channels Channels, orgID string) (*Config, error) {
	cfg, err := NewDefaultConfig(
		globalConfig,
		routeConfig,
		orgID,
	)
	if err != nil {
		return nil, err
	}

	for _, channel := range channels {
		receiver, err := NewReceiver(channel.Data)
		if err != nil {
			return nil, err
		}

		err = cfg.CreateReceiver(receiver)
		if err != nil {
			return nil, err
		}
	}

	return cfg, nil
}

func NewStatsFromChannels(channels Channels) map[string]any {
	stats := make(map[string]any)
	for _, channel := range channels {
		key := "alertmanager.channel.type." + channel.Type

		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}
	}

	stats["alertmanager.channel.count"] = int64(len(channels))
	return stats
}

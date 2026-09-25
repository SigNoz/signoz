package alertmanagertypes

import (
	"crypto/rand"
	"regexp"
	"strings"

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
	Type        string `json:"type" required:"true" bun:"type"`
	Data        string `json:"data" required:"true" bun:"data"`
	// Config is the v2 config a read returns. A v2 write stores it as the caller
	// wrote it and a v1 write derives it from the defaulted receiver. Only a row
	// the migration could not backfill has none.
	Config ChannelConfig `json:"-" bun:"config,type:text,nullzero"`
	OrgID  string        `json:"orgId" required:"true" bun:"org_id"`
}

const channelNameSuffixLen = 8

// generateChannelName is a copy of dashboardtypes.generateDashboardName: slugify
// the display name, then append a random suffix rather than looping on collisions.
func generateChannelName(displayName string) string {
	const dns1123LabelMaxLen = 63
	suffixAlphabet := []byte("abcdefghijklmnopqrstuvwxyz0123456789")

	var b strings.Builder
	b.Grow(len(displayName))
	prevHyphen := false
	for _, r := range strings.ToLower(displayName) {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevHyphen = false
		case b.Len() > 0 && !prevHyphen:
			b.WriteByte('-')
			prevHyphen = true
		}
	}
	prefix := strings.TrimRight(b.String(), "-")

	suffix := make([]byte, channelNameSuffixLen)
	if _, err := rand.Read(suffix); err != nil {
		panic(errors.WrapInternalf(err, errors.CodeInternal, "read random for channel name suffix"))
	}
	for i := range suffix {
		suffix[i] = suffixAlphabet[int(suffix[i])%len(suffixAlphabet)]
	}

	maxPrefix := dns1123LabelMaxLen - 1 - channelNameSuffixLen
	if len(prefix) > maxPrefix {
		prefix = strings.TrimRight(prefix[:maxPrefix], "-")
	}
	if prefix == "" {
		return string(suffix)
	}
	return prefix + "-" + string(suffix)
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

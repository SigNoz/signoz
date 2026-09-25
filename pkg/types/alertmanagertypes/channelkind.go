package alertmanagertypes

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeChannelUnsupportedKind = errors.MustNewCode("channel_unsupported_kind")
)

// ChannelKind selects which ChannelSpec a channel carries and which notifier
// integration is built for it.
type ChannelKind struct {
	valuer.String
}

var (
	ChannelKindSlack      = ChannelKind{valuer.NewString("slack")}
	ChannelKindEmail      = ChannelKind{valuer.NewString("email")}
	ChannelKindWebhook    = ChannelKind{valuer.NewString("webhook")}
	ChannelKindPagerduty  = ChannelKind{valuer.NewString("pagerduty")}
	ChannelKindOpsgenie   = ChannelKind{valuer.NewString("opsgenie")}
	ChannelKindMSTeams    = ChannelKind{valuer.NewString("msteams")}
	ChannelKindGoogleChat = ChannelKind{valuer.NewString("googlechat")}
	ChannelKindJira       = ChannelKind{valuer.NewString("jira")}
	ChannelKindJSMOps     = ChannelKind{valuer.NewString("jsmops")}
	ChannelKindIncidentIO = ChannelKind{valuer.NewString("incidentio")}
)

func (ChannelKind) Enum() []any {
	kinds := make([]any, 0, len(channelKinds))
	for _, channelKind := range channelKinds {
		kinds = append(kinds, channelKind.kind)
	}
	return kinds
}

func (t ChannelKind) IsValid() bool {
	return slices.ContainsFunc(t.Enum(), func(v any) bool { return v == t })
}

// ToStoredType returns the Channel.Type a channel of this kind is stored under,
// which matches the kind for all but msteams.
func (t ChannelKind) ToStoredType() string {
	if t == ChannelKindMSTeams {
		return "msteamsv2"
	}

	return t.StringValue()
}

func ErrUnsupportedChannelKind(s string) error {
	return errors.Newf(
		errors.TypeInvalidInput,
		ErrCodeChannelUnsupportedKind,
		"unknown notification channel kind %q; allowed values: %s",
		s, allowedValuesForChannelKind(),
	)
}

// parseStoredChannelType inverts ToStoredType. It reports false for the notifier
// kinds v1 accepted but v2 does not model.
func parseStoredChannelType(stored string) (ChannelKind, bool) {
	for _, channelKind := range channelKinds {
		if channelKind.kind.ToStoredType() == stored {
			return channelKind.kind, true
		}
	}

	return ChannelKind{}, false
}

func allowedValuesForChannelKind() string {
	return formatAllowedValues((ChannelKind{}).Enum())
}

func formatAllowedValues(enum []any) string {
	values := make([]string, 0, len(enum))
	for _, value := range enum {
		stringValuer, ok := value.(interface{ StringValue() string })
		if !ok {
			continue
		}

		values = append(values, "`"+stringValuer.StringValue()+"`")
	}
	slices.Sort(values)

	return strings.Join(values, ", ")
}

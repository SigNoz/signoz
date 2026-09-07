package alertmanagertypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListChannelsParamsValidateBoundsTheLimit(t *testing.T) {
	omitted := &ListChannelsParams{}
	require.NoError(t, omitted.Validate())
	assert.Equal(t, DefaultChannelListLimit, omitted.Limit)

	beyondTheMaximum := &ListChannelsParams{Limit: MaxChannelListLimit + 1}
	require.NoError(t, beyondTheMaximum.Validate())
	assert.Equal(t, MaxChannelListLimit, beyondTheMaximum.Limit)
}

// Sorting by name orders by the display name, because the DNS1123 name is a slug
// a caller never sees.
func TestChannelListSortToColumn(t *testing.T) {
	assert.Equal(t, "display_name", ChannelListSortName.ToColumn())
	assert.Equal(t, "updated_at", ChannelListSortUpdatedAt.ToColumn())
	assert.Equal(t, "created_at", ChannelListSortCreatedAt.ToColumn())
}

func TestListChannelsParamsValidateKeepsAnExplicitSortAndOrder(t *testing.T) {
	params := &ListChannelsParams{Sort: ChannelListSortName, Order: ChannelListOrderAsc}
	require.NoError(t, params.Validate())

	assert.Equal(t, ChannelListSortName, params.Sort)
	assert.Equal(t, ChannelListOrderAsc, params.Order)
}

func TestListChannelsParamsValidateRejectsALongQuery(t *testing.T) {
	params := ListChannelsParams{Query: strings.Repeat("x", MaxChannelListQueryLen+1)}
	assert.Error(t, params.Validate())
}

// v1 accepted every upstream notifier kind, so rows this API does not model are
// possible. One of them must not fail the whole list.
func TestChannelToListedChannelToleratesUnmodelledKinds(t *testing.T) {
	channel := Channel{
		DisplayName: "tg",
		Name:        "tg",
		Type:        "telegram",
		Data:        `{"name":"tg","telegram_configs":[{"chat_id":1}]}`,
	}

	listed := channel.ToListedNotificationChannel()
	assert.Equal(t, "tg", listed.Name)
	assert.Nil(t, listed.Kind)

	raw, err := json.Marshal(listed)
	require.NoError(t, err)
	assert.NotContains(t, string(raw), "kind")
}

// msteams is the only kind whose stored Channel.Type differs from the api kind,
// so ToStoredType has to agree with the type the write path derives.
func TestChannelKindMSTeamsIsStoredAsMSTeamsV2(t *testing.T) {
	assert.Equal(t, "msteamsv2", ChannelKindMSTeams.ToStoredType())

	postable := PostableNotificationChannel{
		Name:        "channel",
		DisplayName: "channel",
		Config:      ChannelConfig{Kind: ChannelKindMSTeams, Spec: &ChannelMSTeamsConfig{WebhookURL: "https://a"}},
	}

	receiver, err := postable.ToReceiver()
	require.NoError(t, err)

	channel, err := NewChannelFromReceiverWithName(receiver, postable.Name, "org-1")
	require.NoError(t, err)

	assert.Equal(t, "msteamsv2", channel.Type)
}

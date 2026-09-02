package sqlalertmanagerstore

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestCreateChannelRejectsDuplicateNameInSameOrg(t *testing.T) {
	sqlstore := newTestStore(t)

	_, err := sqlstore.BunDB().NewCreateTable().
		Model((*alertmanagertypes.Channel)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	_, err = sqlstore.BunDB().NewCreateIndex().
		Model((*alertmanagertypes.Channel)(nil)).
		Index("notification_channel_org_id_name_idx").
		Column("org_id", "name").
		Unique().
		Exec(t.Context())
	require.NoError(t, err)

	store := NewConfigStore(sqlstore)
	orgID := valuer.GenerateUUID().StringValue()
	now := time.Now().UTC()

	firstChannel := &alertmanagertypes.Channel{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          "shared-name",
		DisplayName:   "First Channel",
		Type:          "slack",
		Data:          `{"name":"First Channel","slack_configs":[{"api_url":"https://hooks.slack.com/services/first"}]}`,
		OrgID:         orgID,
	}
	require.NoError(t, store.CreateChannel(t.Context(), firstChannel))

	duplicateChannel := &alertmanagertypes.Channel{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          "shared-name",
		DisplayName:   "Second Channel",
		Type:          "slack",
		Data:          `{"name":"Second Channel","slack_configs":[{"api_url":"https://hooks.slack.com/services/second"}]}`,
		OrgID:         orgID,
	}
	err = store.CreateChannel(t.Context(), duplicateChannel)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeAlreadyExists))

	otherOrgChannel := &alertmanagertypes.Channel{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          "shared-name",
		DisplayName:   "Second Channel",
		Type:          "slack",
		Data:          `{"name":"Second Channel","slack_configs":[{"api_url":"https://hooks.slack.com/services/second"}]}`,
		OrgID:         valuer.GenerateUUID().StringValue(),
	}
	assert.NoError(t, store.CreateChannel(t.Context(), otherOrgChannel))
}

package signozalertmanager

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
)

func newTestSQLStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()

	store, err := sqlitesqlstore.New(t.Context(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "test.db"),
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*alertmanagertypes.StoreableConfig)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	_, err = store.BunDB().ExecContext(t.Context(), "CREATE UNIQUE INDEX IF NOT EXISTS idx_alertmanager_config_org_id ON alertmanager_config(org_id)")
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*alertmanagertypes.Channel)(nil)).
		IfNotExists().
		Exec(t.Context())
	require.NoError(t, err)

	return store
}

func newTestProvider(t *testing.T) (*provider, sqlstore.SQLStore) {
	t.Helper()

	serverConfig := alertmanagerserver.NewConfig()
	serverConfig.Global.SMTPFrom = "alerts@example.com"
	serverConfig.Global.SMTPSmarthost = config.HostPort{Host: "smtp.sendgrid.net", Port: "587"}
	serverConfig.Global.SMTPAuthUsername = "apikey"
	serverConfig.Global.SMTPAuthPassword = "operator-secret"

	sqlStore := newTestSQLStore(t)

	p, err := New(
		factorytest.NewSettings(),
		alertmanager.Config{
			Provider: "signoz",
			Signoz: alertmanager.Signoz{
				PollInterval: time.Minute,
				Config:       serverConfig,
			},
		},
		sqlStore,
		nil,
		nil,
		nil,
	)
	require.NoError(t, err)

	return p, sqlStore
}

func requireNoSMTPSettings(t *testing.T, payload string) {
	t.Helper()

	assert.NotContains(t, payload, "operator-secret")
	assert.NotContains(t, payload, "smtp.sendgrid.net")
	assert.NotContains(t, payload, "apikey")
	assert.NotContains(t, payload, "auth_password")
	assert.NotContains(t, payload, "smtp_auth_password")
}

func TestCreateEmailChannelWithStoredConfigWithoutSMTP(t *testing.T) {
	p, _ := newTestProvider(t)
	orgID := "test-org-1"

	require.NoError(t, p.SetDefaultConfig(t.Context(), orgID))

	seeded, err := p.GetConfig(t.Context(), orgID)
	require.NoError(t, err)
	requireNoSMTPSettings(t, seeded.StoreableConfig().Config)

	receiver, err := alertmanagertypes.NewReceiver(`{"name":"email-receiver","email_configs":[{"to":"team@example.com"}]}`)
	require.NoError(t, err)

	channel, err := p.CreateChannel(t.Context(), orgID, receiver)
	require.NoError(t, err)
	requireNoSMTPSettings(t, channel.Data)

	stored, err := p.GetChannelByID(t.Context(), orgID, channel.ID)
	require.NoError(t, err)
	assert.Contains(t, stored.Data, "team@example.com")
	requireNoSMTPSettings(t, stored.Data)

	cfg, err := p.GetConfig(t.Context(), orgID)
	require.NoError(t, err)
	requireNoSMTPSettings(t, cfg.StoreableConfig().Config)

	require.NoError(t, cfg.SetGlobalConfig(p.config.Signoz.Global))
	resolved, err := cfg.Resolved()
	require.NoError(t, err)
	resolvedReceiver, err := resolved.GetReceiver("email-receiver")
	require.NoError(t, err)
	require.Len(t, resolvedReceiver.EmailConfigs, 1)
	assert.Equal(t, "smtp.sendgrid.net:587", resolvedReceiver.EmailConfigs[0].Smarthost.String())
	assert.Equal(t, "operator-secret", string(resolvedReceiver.EmailConfigs[0].AuthPassword))
}

func TestUpdateStampedLegacyEmailChannel(t *testing.T) {
	p, sqlStore := newTestProvider(t)
	orgID := "test-org-2"

	require.NoError(t, p.SetDefaultConfig(t.Context(), orgID))

	receiver, err := alertmanagertypes.NewReceiver(`{"name":"email-receiver","email_configs":[{"to":"team@example.com"}]}`)
	require.NoError(t, err)
	channel, err := p.CreateChannel(t.Context(), orgID, receiver)
	require.NoError(t, err)

	stampedData := `{"name":"email-receiver","email_configs":[{"send_resolved":false,"to":"team@example.com","from":"old@example.com","hello":"localhost","smarthost":"email-smtp.us-east-1.amazonaws.com:587","auth_username":"AKIA000","auth_password":"old-ses-secret","require_tls":true}]}`
	_, err = sqlStore.BunDB().ExecContext(t.Context(), "UPDATE notification_channel SET data = ? WHERE id = ?", stampedData, channel.ID.StringValue())
	require.NoError(t, err)

	updated, err := alertmanagertypes.NewReceiver(`{"name":"email-receiver","email_configs":[{"to":"new-team@example.com"}]}`)
	require.NoError(t, err)
	require.NoError(t, p.UpdateChannelByReceiverAndID(t.Context(), orgID, updated, channel.ID))

	stored, err := p.GetChannelByID(t.Context(), orgID, channel.ID)
	require.NoError(t, err)
	assert.Contains(t, stored.Data, "new-team@example.com")
	assert.NotContains(t, stored.Data, "old-ses-secret")
	assert.NotContains(t, stored.Data, "amazonaws.com")
	requireNoSMTPSettings(t, stored.Data)

	cfg, err := p.GetConfig(t.Context(), orgID)
	require.NoError(t, err)
	assert.NotContains(t, cfg.StoreableConfig().Config, "old-ses-secret")
	requireNoSMTPSettings(t, cfg.StoreableConfig().Config)
}

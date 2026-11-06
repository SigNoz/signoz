package alertmanagernotify

import (
	"log/slog"
	"net/url"
	"testing"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Upstream builds its own mattermost integration for the same config; only the
// custom one may be kept, or every alert would post twice.
func TestNewReceiverIntegrationsBuildsOneMattermostIntegration(t *testing.T) {
	tmpl := test.CreateTmpl(t)
	logger := slog.New(slog.DiscardHandler)
	webhookURL, err := url.Parse("https://mattermost.example.com/hooks/abc")
	require.NoError(t, err)

	receiver := &alertmanagertypes.Receiver{Receiver: &config.Receiver{
		Name: "mm",
		MattermostConfigs: []*config.MattermostConfig{{
			HTTPConfig: &commoncfg.HTTPClientConfig{},
			WebhookURL: &config.SecretURL{URL: webhookURL},
			Text:       config.DefaultMattermostConfig.Text,
		}},
	}}

	integrations, err := NewReceiverIntegrations(receiver, tmpl, logger, alertmanagertemplate.New(tmpl, logger))
	require.NoError(t, err)
	require.Len(t, integrations, 1)
	assert.Equal(t, "mattermost", integrations[0].Name())
}

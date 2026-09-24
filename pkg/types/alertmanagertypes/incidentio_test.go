package alertmanagertypes

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testIncidentIOURL = "https://api.incident.io/v2/alert_events/http/01M0D1JNVBGBGVTWX053EM12XV"

func TestIncidentIOReceiverConfigDefaults(t *testing.T) {
	r, err := NewReceiver(fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s","token":"tok-123"}]}`, testIncidentIOURL))
	require.NoError(t, err)
	require.Len(t, r.IncidentIOConfigs, 1)

	c := r.IncidentIOConfigs[0]
	assert.Equal(t, testIncidentIOURL, c.URL)
	assert.Equal(t, "tok-123", string(c.Token))
	assert.Equal(t, DefaultIncidentIOTitleTemplate, c.Title)
	assert.Equal(t, DefaultIncidentIODescriptionTemplate, c.Description)
	assert.False(t, c.SendResolved()) // default off when omitted, like other channels

	ch, err := NewChannelFromReceiver(r, "org-1")
	require.NoError(t, err)
	assert.Equal(t, "incidentio", ch.Type)
}

func TestIncidentIOReceiverConfigOverrides(t *testing.T) {
	r, err := NewReceiver(fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s","token":"k","title":"t","description":"d","send_resolved":true}]}`, testIncidentIOURL))
	require.NoError(t, err)
	require.Len(t, r.IncidentIOConfigs, 1)

	c := r.IncidentIOConfigs[0]
	assert.Equal(t, testIncidentIOURL, c.URL)
	assert.Equal(t, "t", c.Title)
	assert.Equal(t, "d", c.Description)
	assert.True(t, c.SendResolved())
}

func TestIncidentIOReceiverConfigValidation(t *testing.T) {
	cases := []struct {
		name string
		json string
	}{
		{"missing url", `{"name":"incio","incidentio_configs":[{"token":"k"}]}`},
		{"http url", `{"name":"incio","incidentio_configs":[{"url":"http://api.incident.io/v2/alert_events/http/abc","token":"k"}]}`},
		{"not an alert events url", `{"name":"incio","incidentio_configs":[{"url":"https://api.incident.io/v2/incidents","token":"k"}]}`},
		{"missing source config id", `{"name":"incio","incidentio_configs":[{"url":"https://api.incident.io/v2/alert_events/http/","token":"k"}]}`},
		{"trailing slash", fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s/","token":"k"}]}`, testIncidentIOURL)},
		{"whitespace around url", fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":" %s ","token":"k"}]}`, testIncidentIOURL)},
		{"missing token", fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s"}]}`, testIncidentIOURL)},
		{"bearer prefixed token", fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s","token":"Bearer tok-123"}]}`, testIncidentIOURL)},
		{"lowercase bearer prefixed token", fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s","token":"bearer tok-123"}]}`, testIncidentIOURL)},
		{"bearer only token", fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s","token":"Bearer"}]}`, testIncidentIOURL)},
		{"whitespace around token", fmt.Sprintf(`{"name":"incio","incidentio_configs":[{"url":"%s","token":" tok-123 "}]}`, testIncidentIOURL)},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := NewReceiver(c.json)
			assert.Error(t, err)
		})
	}
}

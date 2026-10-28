package jsmops

import (
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify/test"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToOpsGenieConfig(t *testing.T) {
	c := &alertmanagertypes.JSMOpsReceiverConfig{
		APIKey:      "key-123",
		Message:     "msg",
		Description: "desc",
		Priority:    "P1",
		Tags:        "signoz",
		HTTPConfig:  &commoncfg.HTTPClientConfig{},
	}

	og, err := toOpsGenieConfig(c)
	require.NoError(t, err)

	// Trailing slash is required: the Opsgenie notifier appends "v2/alerts..."
	// with no separator, yielding /jsm/ops/integration/v2/alerts.
	assert.Equal(t, "https://api.atlassian.com/jsm/ops/integration/", og.APIURL.String())
	assert.Equal(t, "key-123", string(og.APIKey))
	assert.Equal(t, "msg", og.Message)
	assert.Equal(t, "desc", og.Description)
	assert.Equal(t, "P1", og.Priority)
	assert.Equal(t, "signoz", og.Tags)
	assert.Equal(t, source, og.Source)
	assert.Same(t, c.HTTPConfig, og.HTTPConfig)
}

func TestToOpsGenieConfigNilHTTPConfig(t *testing.T) {
	og, err := toOpsGenieConfig(&alertmanagertypes.JSMOpsReceiverConfig{APIKey: "k"})
	require.NoError(t, err)
	assert.NotNil(t, og.HTTPConfig)
}

func TestDefaultDescriptionRelatedTracesLabel(t *testing.T) {
	testCases := []struct {
		name string
		link string
		want string
	}{
		{name: "TracesExplorer", link: "https://signoz.example/traces-explorer?q=1", want: "[View related traces]"},
		{name: "AITracesExplorer", link: "https://signoz.example/ai-observability/explorer?q=1", want: "[View related AI traces]"},
		{name: "PrefixedInstall", link: "https://signoz.example/signoz/ai-observability/explorer?q=1", want: "[View related AI traces]"},
		{name: "AIObservabilityHost", link: "https://ai-observability.acme.com/traces-explorer", want: "[View related traces]"},
		{name: "AIObservabilityInQuery", link: "https://signoz.example/traces-explorer?q=/ai-observability/", want: "[View related traces]"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			tmpl := test.CreateTmpl(t)
			templater := alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
			a := &types.Alert{Alert: model.Alert{
				Labels:      model.LabelSet{"alertname": "HighCPU"},
				Annotations: model.LabelSet{"related_traces": model.LabelValue(testCase.link)},
				StartsAt:    time.Now().Add(-time.Minute),
				EndsAt:      time.Now().Add(time.Hour),
			}}

			result, err := templater.Expand(context.Background(), alertmanagertypes.ExpandRequest{
				DefaultTitleTemplate: alertmanagertypes.DefaultJSMOpsMessageTemplate,
				DefaultBodyTemplate:  alertmanagertypes.DefaultJSMOpsDescriptionTemplate,
			}, []*types.Alert{a})
			require.NoError(t, err)

			assert.Contains(t, strings.Join(result.Body, ""), testCase.want+"("+testCase.link+")")
		})
	}
}

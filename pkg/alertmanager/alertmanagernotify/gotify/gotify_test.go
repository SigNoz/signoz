package gotify

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/notify/test"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestTemplater(tmpl *template.Template) alertmanagertypes.Templater {
	return alertmanagertemplate.New(tmpl, slog.New(slog.DiscardHandler))
}

func TestGotifyNotifier(t *testing.T) {
	tmpl := test.CreateTmpl(t)

	var (
		payload Message
		method  string
		reqURI  string
	)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		method = r.Method
		reqURI = r.URL.RequestURI()

		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		err = json.Unmarshal(body, &payload)
		require.NoError(t, err)

		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	u, err := url.Parse(ts.URL)
	require.NoError(t, err)
	conf := &alertmanagertypes.GotifyReceiverConfig{
		URL:        &config.URL{URL: u},
		Token:      config.Secret("test-token"),
		Priority:   7,
		Title:      "Test Title: {{ .CommonLabels.alertname }}",
		Message:    "Alert: {{ .CommonLabels.alertname }} is firing!",
		HTTPConfig: &commoncfg.HTTPClientConfig{},
	}

	notifier, err := New(conf, tmpl, slog.New(slog.DiscardHandler), newTestTemplater(tmpl))
	require.NoError(t, err)

	ctx := notify.WithGroupKey(context.Background(), "test-group-key")
	alerts := []*types.Alert{
		{
			Alert: model.Alert{
				Labels: model.LabelSet{
					"alertname": "GotifyTestAlert",
				},
			},
		},
	}

	retry, err := notifier.Notify(ctx, alerts...)
	require.NoError(t, err)
	assert.False(t, retry)

	assert.Equal(t, "POST", method)
	assert.Equal(t, "/message?token=test-token", reqURI)
	assert.Equal(t, "Test Title: GotifyTestAlert", payload.Title)
	assert.Equal(t, "Alert: GotifyTestAlert is firing!", payload.Message)
	assert.Equal(t, 7, payload.Priority)
}

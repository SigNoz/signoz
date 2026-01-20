package msteamsv2

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"
	"time"

	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/prometheus/common/promslog"
	"github.com/stretchr/testify/require"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
)

// This is a test URL that has been modified to not be valid.
var testWebhookURL, _ = url.Parse("https://example.westeurope.logic.azure.com:443/workflows/xxx/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xxx")

func TestMSTeamsV2Retry(t *testing.T) {
	notifier, err := New(
		&config.MSTeamsV2Config{
			WebhookURL: &config.SecretURL{URL: testWebhookURL},
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		test.CreateTmpl(t),
		`{{ template "msteamsv2.default.titleLink" . }}`,
		promslog.NewNopLogger(),
	)
	require.NoError(t, err)

	for statusCode, expected := range test.RetryTests(test.DefaultRetryCodes()) {
		actual, _ := notifier.retrier.Check(statusCode, nil)
		require.Equal(t, expected, actual, "retry - error on status %d", statusCode)
	}
}

func TestNotifier_Notify_WithReason(t *testing.T) {
	tests := []struct {
		name            string
		statusCode      int
		responseContent string
		expectedReason  notify.Reason
		noError         bool
	}{
		{
			name:            "with a 2xx status code and response 1",
			statusCode:      http.StatusOK,
			responseContent: "1",
			noError:         true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			notifier, err := New(
				&config.MSTeamsV2Config{
					WebhookURL: &config.SecretURL{URL: testWebhookURL},
					HTTPConfig: &commoncfg.HTTPClientConfig{},
				},
				test.CreateTmpl(t),
				`{{ template "msteamsv2.default.titleLink" . }}`,
				promslog.NewNopLogger(),
			)
			require.NoError(t, err)

			notifier.postJSONFunc = func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error) {
				resp := httptest.NewRecorder()
				_, err := resp.WriteString(tt.responseContent)
				require.NoError(t, err)
				resp.WriteHeader(tt.statusCode)
				return resp.Result(), nil
			}
			ctx := context.Background()
			ctx = notify.WithGroupKey(ctx, "1")

			alert1 := &types.Alert{
				Alert: model.Alert{
					StartsAt: time.Now(),
					EndsAt:   time.Now().Add(time.Hour),
				},
			}
			_, err = notifier.Notify(ctx, alert1)
			if tt.noError {
				require.NoError(t, err)
			} else {
				var reasonError *notify.ErrorWithReason
				require.ErrorAs(t, err, &reasonError)
				require.Equal(t, tt.expectedReason, reasonError.Reason)
			}
		})
	}
}

func TestMSTeamsV2Templating(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dec := json.NewDecoder(r.Body)
		out := make(map[string]any)
		err := dec.Decode(&out)
		if err != nil {
			panic(err)
		}
	}))
	defer srv.Close()
	u, _ := url.Parse(srv.URL)

	for _, tc := range []struct {
		title     string
		cfg       *config.MSTeamsV2Config
		titleLink string

		retry  bool
		errMsg string
	}{
		{
			title: "full-blown message",
			cfg: &config.MSTeamsV2Config{
				Title: `{{ template "msteams.default.title" . }}`,
				Text:  `{{ template "msteams.default.text" . }}`,
			},
			titleLink: `{{ template "msteamsv2.default.titleLink" . }}`,
			retry:     false,
		},
		{
			title: "title with templating errors",
			cfg: &config.MSTeamsV2Config{
				Title: "{{ ",
			},
			titleLink: `{{ template "msteamsv2.default.titleLink" . }}`,
			errMsg:    "template: :1: unclosed action",
		},
		{
			title: "message with title link templating errors",
			cfg: &config.MSTeamsV2Config{
				Title: `{{ template "msteams.default.title" . }}`,
				Text:  `{{ template "msteams.default.text" . }}`,
			},
			titleLink: `{{ `,
			errMsg:    "template: :1: unclosed action",
		},
	} {
		t.Run(tc.title, func(t *testing.T) {
			tc.cfg.WebhookURL = &config.SecretURL{URL: u}
			tc.cfg.HTTPConfig = &commoncfg.HTTPClientConfig{}
			pd, err := New(tc.cfg, test.CreateTmpl(t), tc.titleLink, promslog.NewNopLogger())
			require.NoError(t, err)

			ctx := context.Background()
			ctx = notify.WithGroupKey(ctx, "1")

			ok, err := pd.Notify(ctx, []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"lbl1": "val1",
						},
						StartsAt: time.Now(),
						EndsAt:   time.Now().Add(time.Hour),
					},
				},
			}...)
			if tc.errMsg == "" {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
				require.Contains(t, err.Error(), tc.errMsg)
			}
			require.Equal(t, tc.retry, ok)
		})
	}
}

func TestMSTeamsV2RedactedURL(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	secret := "secret"
	notifier, err := New(
		&config.MSTeamsV2Config{
			WebhookURL: &config.SecretURL{URL: u},
			HTTPConfig: &commoncfg.HTTPClientConfig{},
		},
		test.CreateTmpl(t),
		`{{ template "msteamsv2.default.titleLink" . }}`,
		promslog.NewNopLogger(),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, secret)
}

func TestMSTeamsV2ReadingURLFromFile(t *testing.T) {
	ctx, u, fn := test.GetContextWithCancelingURL()
	defer fn()

	f, err := os.CreateTemp("", "webhook_url")
	require.NoError(t, err, "creating temp file failed")
	_, err = f.WriteString(u.String() + "\n")
	require.NoError(t, err, "writing to temp file failed")

	notifier, err := New(
		&config.MSTeamsV2Config{
			WebhookURLFile: f.Name(),
			HTTPConfig:     &commoncfg.HTTPClientConfig{},
		},
		test.CreateTmpl(t),
		`{{ template "msteamsv2.default.titleLink" . }}`,
		promslog.NewNopLogger(),
	)
	require.NoError(t, err)

	test.AssertNotifyLeaksNoSecret(ctx, t, notifier, u.String())
}

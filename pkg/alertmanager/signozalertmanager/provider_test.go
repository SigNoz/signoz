package signozalertmanager

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolveJiraCloudIDsIgnoresClientSuppliedValues(t *testing.T) {
	cases := []struct {
		name         string
		username     string
		clientSent   string
		serverStatus int
		wantCloudID  string
		wantErr      bool
		wantHits     int32
	}{
		{
			name:         "service_account_bogus_cloud_id_is_replaced",
			username:     "bot@serviceaccount.atlassian.com",
			clientSent:   "bogus",
			serverStatus: http.StatusOK,
			wantCloudID:  "resolved-123",
			wantHits:     1,
		},
		{
			name:        "personal_token_cloud_id_is_cleared_without_resolving",
			username:    "user@signoz.io",
			clientSent:  "bogus",
			wantCloudID: "",
			wantHits:    0,
		},
		{
			name:         "service_account_resolve_error_fails_save",
			username:     "bot@serviceaccount.atlassian.com",
			serverStatus: http.StatusInternalServerError,
			wantErr:      true,
			wantHits:     1,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var hits atomic.Int32
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				hits.Add(1)
				w.WriteHeader(tc.serverStatus)
				_, _ = w.Write([]byte(`{"cloudId":"resolved-123"}`))
			}))
			defer srv.Close()

			receiver := &alertmanagertypes.Receiver{
				JiraConfigs: []*alertmanagertypes.JiraReceiverConfig{{
					Site:    srv.URL,
					CloudID: tc.clientSent,
					HTTPConfig: &commoncfg.HTTPClientConfig{
						BasicAuth: &commoncfg.BasicAuth{Username: tc.username},
					},
				}},
			}

			err := resolveJiraCloudIDs(context.Background(), receiver)
			if tc.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.wantCloudID, receiver.JiraConfigs[0].CloudID)
			}
			assert.Equal(t, tc.wantHits, hits.Load())
		})
	}
}

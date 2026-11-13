package signozalertmanager

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

const (
	testWebhookSecretURL = "https://hooks.example.com/services/SECRET_WEBHOOK_TOKEN"
	testSecretPassword   = "s3cr3t-basic-auth-password"
	testSecretBearer     = "SECRET-BEARER-TOKEN-VALUE"
)

// stubRoleChecker fakes the OpenFGA admin check: a nil adminErr means the
// caller is an admin, any error means viewer/editor.
type stubRoleChecker struct{ adminErr error }

func (s stubRoleChecker) CheckWithTupleCreation(context.Context, authtypes.Claims, valuer.UUID, authtypes.Relation, coretypes.Resource, []coretypes.Selector, []coretypes.Selector) error {
	return s.adminErr
}

func testStoredChannel(orgID string) *alertmanagertypes.Channel {
	return &alertmanagertypes.Channel{
		DisplayName: "test-webhook",
		Type:        alertmanagertypes.ChannelKindWebhook.StringValue(),
		Data: `{"name":"test-webhook","webhook_configs":[` +
			`{"send_resolved":true,"url":"` + testWebhookSecretURL + `",` +
			`"http_config":{"basic_auth":{"username":"svc-user","password":"` + testSecretPassword + `"},` +
			`"authorization":{"type":"Bearer","credentials":"` + testSecretBearer + `"}}}]}`,
		OrgID: orgID,
	}
}

func requestWithClaims(t *testing.T, orgID string) *http.Request {
	t.Helper()
	claims := authtypes.Claims{
		UserID: valuer.GenerateUUID().String(),
		Email:  "viewer@example.com",
		OrgID:  orgID,
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/channels", nil)
	return req.WithContext(authtypes.NewContextWithClaims(req.Context(), claims))
}

func TestListChannels_RedactsSecretsForViewer(t *testing.T) {
	orgID := valuer.GenerateUUID().String()
	channelID := valuer.GenerateUUID()

	stored := testStoredChannel(orgID)
	stored.Identifiable.ID = channelID

	am := alertmanagertest.NewMockAlertmanager(t)
	am.On("ListChannels", mock.Anything, orgID).Return([]*alertmanagertypes.Channel{stored}, nil)

	h := NewHandler(am, stubRoleChecker{adminErr: assert.AnError})

	rw := httptest.NewRecorder()
	h.ListChannels(rw, requestWithClaims(t, orgID))

	require.Equal(t, http.StatusOK, rw.Code)

	var body struct {
		Data []alertmanagertypes.Channel `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rw.Body.Bytes(), &body))
	require.Len(t, body.Data, 1)

	data := body.Data[0].Data
	assert.NotContains(t, data, testWebhookSecretURL, "viewer must not see the webhook URL")
	assert.NotContains(t, data, testSecretPassword, "viewer must not see the basic auth password")
	assert.NotContains(t, data, testSecretBearer, "viewer must not see the bearer token")
	assert.Contains(t, data, alertmanagertypes.RedactedSecretValue)
	assert.Contains(t, data, "svc-user", "non-secret config must survive redaction")

	// The stored channel must not be mutated by the read path.
	assert.Contains(t, stored.Data, testSecretBearer)
}

func TestListChannels_KeepsSecretsForAdmin(t *testing.T) {
	orgID := valuer.GenerateUUID().String()
	stored := testStoredChannel(orgID)

	am := alertmanagertest.NewMockAlertmanager(t)
	am.On("ListChannels", mock.Anything, orgID).Return([]*alertmanagertypes.Channel{stored}, nil)

	h := NewHandler(am, stubRoleChecker{adminErr: nil})

	rw := httptest.NewRecorder()
	h.ListChannels(rw, requestWithClaims(t, orgID))

	require.Equal(t, http.StatusOK, rw.Code)

	var body struct {
		Data []alertmanagertypes.Channel `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rw.Body.Bytes(), &body))
	require.Len(t, body.Data, 1)

	data := body.Data[0].Data
	assert.Contains(t, data, testWebhookSecretURL, "admin must still see the webhook URL")
	assert.Contains(t, data, testSecretPassword, "admin must still see the basic auth password")
	assert.Contains(t, data, testSecretBearer, "admin must still see the bearer token")
}

func TestGetChannelByID_RedactsSecretsForViewer(t *testing.T) {
	orgID := valuer.GenerateUUID().String()
	channelID := valuer.GenerateUUID()
	stored := testStoredChannel(orgID)
	stored.Identifiable.ID = channelID

	am := alertmanagertest.NewMockAlertmanager(t)
	am.On("GetChannelByID", mock.Anything, orgID, channelID).Return(stored, nil)

	h := NewHandler(am, stubRoleChecker{adminErr: assert.AnError})

	req := requestWithClaims(t, orgID)
	req = mux.SetURLVars(req, map[string]string{"id": channelID.String()})

	rw := httptest.NewRecorder()
	h.GetChannelByID(rw, req)

	require.Equal(t, http.StatusOK, rw.Code)

	var body struct {
		Data alertmanagertypes.Channel `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rw.Body.Bytes(), &body))

	data := body.Data.Data
	assert.NotContains(t, data, testWebhookSecretURL)
	assert.NotContains(t, data, testSecretPassword)
	assert.NotContains(t, data, testSecretBearer)
	assert.Contains(t, data, alertmanagertypes.RedactedSecretValue)
}

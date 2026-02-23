package httpgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/gatewaytypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testLicensing is a minimal licensing mock that returns a fake license from GetActive.
type testLicensing struct {
	key string
}

func (t *testLicensing) Start(context.Context) error { return nil }
func (t *testLicensing) Stop(context.Context) error  { return nil }

func (t *testLicensing) Validate(context.Context) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not supported")
}

func (t *testLicensing) Activate(context.Context, valuer.UUID, string) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not supported")
}

func (t *testLicensing) GetActive(_ context.Context, _ valuer.UUID) (*licensetypes.License, error) {
	return &licensetypes.License{Key: t.key}, nil
}

func (t *testLicensing) Refresh(context.Context, valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not supported")
}

func (t *testLicensing) Checkout(context.Context, valuer.UUID, *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not supported")
}

func (t *testLicensing) Portal(context.Context, valuer.UUID, *licensetypes.PostableSubscription) (*licensetypes.GettableSubscription, error) {
	return nil, errors.New(errors.TypeUnsupported, licensing.ErrCodeUnsupported, "not supported")
}

func (t *testLicensing) GetFeatureFlags(context.Context, valuer.UUID) ([]*licensetypes.Feature, error) {
	return licensetypes.DefaultFeatureSet, nil
}

func (t *testLicensing) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return map[string]any{}, nil
}

func int64Ptr(v int64) *int64 {
	return &v
}

// setupTestProvider creates a test HTTP server that captures request bodies,
// and returns the provider and a channel to read captured bodies from.
func setupTestProvider(t *testing.T) (gateway.Gateway, <-chan []byte, *httptest.Server) {
	t.Helper()

	bodyCh := make(chan []byte, 1)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		bodyCh <- body

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		// Return a minimal valid response with data wrapper.
		w.Write([]byte(`{"data": {"id": "test-id"}}`))
	}))

	serverURL, err := url.Parse(server.URL)
	require.NoError(t, err)

	config := gateway.Config{URL: serverURL}
	provider, err := New(context.Background(), factorytest.NewSettings(), config, &testLicensing{key: "test-license-key"})
	require.NoError(t, err)

	t.Cleanup(func() {
		server.Close()
	})

	return provider, bodyCh, server
}

func TestUpdateIngestionKeyLimit_OnlySizeSet(t *testing.T) {
	provider, bodyCh, _ := setupTestProvider(t)

	limitConfig := gatewaytypes.LimitConfig{
		Day: &gatewaytypes.LimitValue{
			Size: int64Ptr(1000),
		},
	}

	err := provider.UpdateIngestionKeyLimit(context.Background(), valuer.GenerateUUID(), "limit-123", limitConfig, []string{"tag1"})
	require.NoError(t, err)

	rawBody := <-bodyCh
	var payload map[string]any
	require.NoError(t, json.Unmarshal(rawBody, &payload))

	config, ok := payload["config"].(map[string]any)
	require.True(t, ok, "expected config to be a map")

	day, ok := config["day"].(map[string]any)
	require.True(t, ok, "expected config.day to be a map")

	_, hasSize := day["size"]
	assert.True(t, hasSize, "expected config.day.size to be present")

	_, hasCount := day["count"]
	assert.False(t, hasCount, "expected config.day.count to be absent")

	_, hasSecond := config["second"]
	assert.False(t, hasSecond, "expected config.second to be absent")
}

func TestUpdateIngestionKeyLimit_OnlyCountSet(t *testing.T) {
	provider, bodyCh, _ := setupTestProvider(t)

	limitConfig := gatewaytypes.LimitConfig{
		Day: &gatewaytypes.LimitValue{
			Count: int64Ptr(500),
		},
	}

	err := provider.UpdateIngestionKeyLimit(context.Background(), valuer.GenerateUUID(), "limit-456", limitConfig, []string{"tag1"})
	require.NoError(t, err)

	rawBody := <-bodyCh
	var payload map[string]any
	require.NoError(t, json.Unmarshal(rawBody, &payload))

	config, ok := payload["config"].(map[string]any)
	require.True(t, ok, "expected config to be a map")

	day, ok := config["day"].(map[string]any)
	require.True(t, ok, "expected config.day to be a map")

	_, hasCount := day["count"]
	assert.True(t, hasCount, "expected config.day.count to be present")

	_, hasSize := day["size"]
	assert.False(t, hasSize, "expected config.day.size to be absent")
}

func TestUpdateIngestionKeyLimit_BothSizeAndCountSet(t *testing.T) {
	provider, bodyCh, _ := setupTestProvider(t)

	limitConfig := gatewaytypes.LimitConfig{
		Day: &gatewaytypes.LimitValue{
			Size:  int64Ptr(1000),
			Count: int64Ptr(500),
		},
	}

	err := provider.UpdateIngestionKeyLimit(context.Background(), valuer.GenerateUUID(), "limit-789", limitConfig, []string{"tag1"})
	require.NoError(t, err)

	rawBody := <-bodyCh
	var payload map[string]any
	require.NoError(t, json.Unmarshal(rawBody, &payload))

	config, ok := payload["config"].(map[string]any)
	require.True(t, ok, "expected config to be a map")

	day, ok := config["day"].(map[string]any)
	require.True(t, ok, "expected config.day to be a map")

	_, hasSize := day["size"]
	assert.True(t, hasSize, "expected config.day.size to be present")

	_, hasCount := day["count"]
	assert.True(t, hasCount, "expected config.day.count to be present")
}

func TestCreateIngestionKeyLimit_OnlySizeSet(t *testing.T) {
	provider, bodyCh, _ := setupTestProvider(t)

	limitConfig := gatewaytypes.LimitConfig{
		Day: &gatewaytypes.LimitValue{
			Size: int64Ptr(2000),
		},
	}

	_, err := provider.CreateIngestionKeyLimit(context.Background(), valuer.GenerateUUID(), "key-abc", "logs", limitConfig, []string{"tag1"})
	require.NoError(t, err)

	rawBody := <-bodyCh
	var payload map[string]any
	require.NoError(t, json.Unmarshal(rawBody, &payload))

	config, ok := payload["config"].(map[string]any)
	require.True(t, ok, "expected config to be a map")

	day, ok := config["day"].(map[string]any)
	require.True(t, ok, "expected config.day to be a map")

	_, hasSize := day["size"]
	assert.True(t, hasSize, "expected config.day.size to be present")

	_, hasCount := day["count"]
	assert.False(t, hasCount, "expected config.day.count to be absent")

	_, hasSecond := config["second"]
	assert.False(t, hasSecond, "expected config.second to be absent")
}

func TestCreateIngestionKeyLimit_OnlyCountSet(t *testing.T) {
	provider, bodyCh, _ := setupTestProvider(t)

	limitConfig := gatewaytypes.LimitConfig{
		Day: &gatewaytypes.LimitValue{
			Count: int64Ptr(750),
		},
	}

	_, err := provider.CreateIngestionKeyLimit(context.Background(), valuer.GenerateUUID(), "key-def", "traces", limitConfig, []string{"tag1"})
	require.NoError(t, err)

	rawBody := <-bodyCh
	var payload map[string]any
	require.NoError(t, json.Unmarshal(rawBody, &payload))

	config, ok := payload["config"].(map[string]any)
	require.True(t, ok, "expected config to be a map")

	day, ok := config["day"].(map[string]any)
	require.True(t, ok, "expected config.day to be a map")

	_, hasCount := day["count"]
	assert.True(t, hasCount, "expected config.day.count to be present")

	_, hasSize := day["size"]
	assert.False(t, hasSize, "expected config.day.size to be absent")
}

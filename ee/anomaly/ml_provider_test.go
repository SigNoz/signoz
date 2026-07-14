package anomaly

import (
	"context"
	"io"
	"log/slog"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type providerFunc func(
	ctx context.Context,
	orgID valuer.UUID,
	request *AnomaliesRequest,
) (*AnomaliesResponse, error)

func (function providerFunc) GetAnomalies(
	ctx context.Context,
	orgID valuer.UUID,
	request *AnomaliesRequest,
) (*AnomaliesResponse, error) {
	return function(ctx, orgID, request)
}

func TestMLProviderDelegatesToBaseProvider(t *testing.T) {
	expectedResponse := &AnomaliesResponse{
		Results: []*qbtypes.TimeSeriesData{},
	}

	var receivedRequest *AnomaliesRequest

	stub := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		request *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		receivedRequest = request
		return expectedResponse, nil
	})

	logger := slog.New(
		slog.NewTextHandler(io.Discard, nil),
	)

	provider := NewMLProvider(
		stub,
		nil,
		logger,
	)

	originalRequest := &AnomaliesRequest{
		Params:      &qbtypes.QueryRangeRequest{},
		Seasonality: SeasonalityWeekly,
	}

	var orgID valuer.UUID

	response, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		originalRequest,
	)
	if err != nil {
		t.Fatalf("get anomalies: %v", err)
	}

	if response != expectedResponse {
		t.Fatal("ML provider did not return the base provider response")
	}

	if receivedRequest == nil {
		t.Fatal("base provider did not receive a request")
	}

	if receivedRequest == originalRequest {
		t.Fatal("ML provider passed the original request without copying it")
	}

	if receivedRequest.Params != originalRequest.Params {
		t.Fatal("ML provider unexpectedly copied query parameters")
	}

	if receivedRequest.Seasonality != originalRequest.Seasonality {
		t.Fatalf(
			"unexpected seasonality: got %q, want %q",
			receivedRequest.Seasonality.StringValue(),
			originalRequest.Seasonality.StringValue(),
		)
	}
}

func TestMLProviderRejectsNilRequest(t *testing.T) {
	stub := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		t.Fatal("base provider must not be called")
		return nil, nil
	})

	provider := NewMLProvider(
		stub,
		nil,
		slog.Default(),
	)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		nil,
	)
	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestMLProviderRejectsNilParams(t *testing.T) {
	stub := providerFunc(func(
		_ context.Context,
		_ valuer.UUID,
		_ *AnomaliesRequest,
	) (*AnomaliesResponse, error) {
		t.Fatal("base provider must not be called")
		return nil, nil
	})

	provider := NewMLProvider(
		stub,
		nil,
		slog.Default(),
	)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		&AnomaliesRequest{},
	)
	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestMLProviderRejectsNilBaseProvider(t *testing.T) {
	provider := NewMLProvider(
		nil,
		nil,
		slog.Default(),
	)

	var orgID valuer.UUID

	_, err := provider.GetAnomalies(
		context.Background(),
		orgID,
		&AnomaliesRequest{
			Params: &qbtypes.QueryRangeRequest{},
		},
	)
	if err == nil {
		t.Fatal("expected an error")
	}
}

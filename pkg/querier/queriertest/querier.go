package queriertest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/querier"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// MockQuerier implements querier.Querier for testing. Each behavior can be
// overridden via a function field; unset fields return empty, non-error values.
type MockQuerier struct {
	QueryRangeFunc        func(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error)
	QueryRawStreamFunc    func(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream)
	QueryRangePreviewFunc func(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, opts qbtypes.QueryRangePreviewOptions) (*qbtypes.QueryRangePreviewResponse, error)
	CollectFunc           func(ctx context.Context, orgID valuer.UUID) (map[string]any, error)
}

var _ querier.Querier = (*MockQuerier)(nil)

// NewMockQuerier creates a new MockQuerier.
func NewMockQuerier() *MockQuerier {
	return &MockQuerier{}
}

func (m *MockQuerier) QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
	if m.QueryRangeFunc != nil {
		return m.QueryRangeFunc(ctx, orgID, req)
	}
	return &qbtypes.QueryRangeResponse{}, nil
}

func (m *MockQuerier) QueryRawStream(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream) {
	if m.QueryRawStreamFunc != nil {
		m.QueryRawStreamFunc(ctx, orgID, req, client)
	}
}

func (m *MockQuerier) QueryRangePreview(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, opts qbtypes.QueryRangePreviewOptions) (*qbtypes.QueryRangePreviewResponse, error) {
	if m.QueryRangePreviewFunc != nil {
		return m.QueryRangePreviewFunc(ctx, orgID, req, opts)
	}
	return &qbtypes.QueryRangePreviewResponse{}, nil
}

func (m *MockQuerier) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	if m.CollectFunc != nil {
		return m.CollectFunc(ctx, orgID)
	}
	return map[string]any{}, nil
}

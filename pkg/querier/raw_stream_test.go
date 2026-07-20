package querier

import (
	"context"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestSendRawStreamLogReturnsWhenContextIsCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	logs := make(chan *qbtypes.RawRow, 1)
	logs <- &qbtypes.RawRow{}

	require.False(t, sendRawStreamLog(ctx, logs, &qbtypes.RawRow{}))
}

func TestSendRawStreamErrorReturnsWhenContextIsCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	require.False(t, sendRawStreamError(ctx, make(chan error), context.Canceled))
}

func TestQueryRawStreamClosesDoneWhenContextIsCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	q := &querier{liveDataRefresh: time.Hour}
	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeRawStream,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Signal: telemetrytypes.SignalLogs,
						Name:   "raw_stream",
					},
				},
			},
		},
	}
	client := &qbtypes.RawStream{
		Logs:  make(chan *qbtypes.RawRow),
		Done:  make(chan *bool),
		Error: make(chan error),
	}

	q.QueryRawStream(ctx, valuer.GenerateUUID(), req, client)

	_, open := <-client.Done
	require.False(t, open)
}

type contextBlockingQuerier struct {
	started chan struct{}
}

func (q *contextBlockingQuerier) QueryRange(context.Context, valuer.UUID, *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
	return nil, nil
}

func (q *contextBlockingQuerier) QueryRawStream(ctx context.Context, _ valuer.UUID, _ *qbtypes.QueryRangeRequest, _ *qbtypes.RawStream) {
	close(q.started)
	<-ctx.Done()
}

func (q *contextBlockingQuerier) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return nil, nil
}

func (q *contextBlockingQuerier) QueryRangePreview(context.Context, valuer.UUID, *qbtypes.QueryRangeRequest, qbtypes.QueryRangePreviewOptions) (*qbtypes.QueryRangePreviewResponse, error) {
	return nil, nil
}

func TestQueryRawStreamHandlerReturnsWhenRequestIsCanceled(t *testing.T) {
	q := &contextBlockingQuerier{started: make(chan struct{})}
	handler := &handler{querier: q}

	ctx, cancel := context.WithCancel(context.Background())
	ctx = authtypes.NewContextWithClaims(ctx, authtypes.Claims{OrgID: valuer.GenerateUUID().StringValue()})
	req := httptest.NewRequest("GET", "/api/v3/logs/livetail", nil).WithContext(ctx)
	rw := httptest.NewRecorder()
	returned := make(chan struct{})

	go func() {
		handler.QueryRawStream(rw, req)
		close(returned)
	}()

	select {
	case <-q.started:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for raw stream query to start")
	}
	cancel()

	select {
	case <-returned:
	case <-time.After(time.Second):
		t.Fatal("raw stream handler did not return after request cancellation")
	}
}

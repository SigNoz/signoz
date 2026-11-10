package spantypestest

import (
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
)

// TraceStoreTest pairs a TraceStore with the ClickHouse mock.
type TraceStoreTest struct {
	store spantypes.TraceStore
	mock  cmock.ClickConnMockCommon
}

func New(store spantypes.TraceStore, mock cmock.ClickConnMockCommon) *TraceStoreTest {
	return &TraceStoreTest{store: store, mock: mock}
}

// Store returns the TraceStore for calling methods under test.
func (t *TraceStoreTest) Store() spantypes.TraceStore { return t.store }

// Mock returns the ClickHouse mock for setting query expectations.
func (t *TraceStoreTest) Mock() cmock.ClickConnMockCommon { return t.mock }

package implexport

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/export"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/valuer"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

const MAX_EXPORT_ROW_COUNT_LIMIT = 50000
const DEFAULT_EXPORT_ROW_COUNT_LIMIT = 10000
const MAX_EXPORT_BYTES_LIMIT = 10 * 1024 * 1024 * 1024 // 10 GB
const CLICKHOUSE_CONTEXT_EXPORT_MAX_THREADS = 2
const CHUNK_SIZE = 5000

type ctxKey string

const CLICKHOUSE_CONTEXT_MAX_THREADS_KEY ctxKey = "clickhouse_max_threads"

type Module struct {
	querier querier.Querier
}

func NewModule(querier querier.Querier) export.Module {
	return &Module{
		querier: querier,
	}
}

func (m *Module) Export(ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest, doneChan chan any) (chan *qbtypes.RawRow, chan error) {

	spec := rangeRequest.CompositeQuery.Queries[0].Spec.(qbtypes.QueryBuilderQuery[qbtypes.LogAggregation])
	rowCountLimit := spec.Limit

	rowChan := make(chan *qbtypes.RawRow, 1)
	errChan := make(chan error, 1)

	go func() {
		defer close(rowChan)

		rowCount := 0

		cursor := ""
		for rowCount < rowCountLimit {
			spec.Limit = min(CHUNK_SIZE, rowCountLimit-rowCount)
			if cursor != "" {
				spec.Cursor = cursor
			}
			rangeRequest.CompositeQuery.Queries[0].Spec = spec

			// Set clickhouse max threads
			ctx := context.WithValue(ctx, CLICKHOUSE_CONTEXT_MAX_THREADS_KEY, CLICKHOUSE_CONTEXT_EXPORT_MAX_THREADS)

			response, err := m.querier.QueryRange(ctx, orgID, rangeRequest)
			if err != nil {
				errChan <- err
				return
			}

			newRowsCount := 0
			for _, result := range response.Data.Results {
				resultData, ok := result.(*qbtypes.RawData)
				if !ok {
					errChan <- errors.NewInvalidInputf(errors.CodeInvalidInput, "expected RawData, got %T", result)
					return
				}

				cursor = resultData.NextCursor

				newRowsCount += len(resultData.Rows)
				for _, row := range resultData.Rows {
					select {
					case rowChan <- row:
					case <-doneChan:
						return
					case <-ctx.Done():
						errChan <- ctx.Err()
						return
					}
				}

			}

			// Break if we did not receive any new rows
			if newRowsCount == 0 {
				return
			}

			rowCount += newRowsCount

		}
	}()

	return rowChan, errChan

}

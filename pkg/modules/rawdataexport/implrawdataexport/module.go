package implrawdataexport

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module struct {
	querier querier.Querier
}

func NewModule(querier querier.Querier) rawdataexport.Module {
	return &Module{
		querier: querier,
	}
}

func (m *Module) ExportRawData(ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest, doneChan chan any) (chan *qbtypes.RawRow, chan error) {

	spec := rangeRequest.CompositeQuery.Queries[0].Spec.(qbtypes.QueryBuilderQuery[qbtypes.LogAggregation])
	rowCountLimit := spec.Limit

	rowChan := make(chan *qbtypes.RawRow, 1)
	errChan := make(chan error, 1)

	go func() {
		// Set clickhouse max threads
		ctx := ctxtypes.SetClickhouseMaxThreads(ctx, ClickhouseExportRawDataMaxThreads)
		// Set clickhouse timeout
		contextWithTimeout, cancel := context.WithTimeout(ctx, ClickhouseExportRawDataTimeout)
		defer cancel()
		defer close(errChan)
		defer close(rowChan)

		rowCount := 0

		for rowCount < rowCountLimit {
			spec.Limit = min(ChunkSize, rowCountLimit-rowCount)
			spec.Offset = rowCount

			rangeRequest.CompositeQuery.Queries[0].Spec = spec

			response, err := m.querier.QueryRange(contextWithTimeout, orgID, rangeRequest)
			if err != nil {
				errChan <- err
				return
			}

			newRowsCount := 0
			for _, result := range response.Data.Results {
				resultData, ok := result.(*qbtypes.RawData)
				if !ok {
					errChan <- errors.NewInternalf(errors.CodeInternal, "expected RawData, got %T", result)
					return
				}

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

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

	isTraceOperatorQueryPresent := false
	traceOperatorQueryIndex := -1

	queries := rangeRequest.CompositeQuery.Queries
	for idx := range len(queries) {
		if _, ok := queries[idx].Spec.(qbtypes.QueryBuilderTraceOperator); ok {
			isTraceOperatorQueryPresent = true
			traceOperatorQueryIndex = idx
			break
		}
	}

	// If the trace operator query is present, mark the queries other than trace operator as disabled
	if isTraceOperatorQueryPresent {
		for idx := range len(queries) {
			if idx != traceOperatorQueryIndex {
				queries[idx].SetDisabled(true)
			}
		}
	}

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

		if isTraceOperatorQueryPresent {
			// If the trace operator query is present, we need to export the data for the trace operator query only
			exportRawDataForSingleQuery(m.querier, contextWithTimeout, orgID, rangeRequest, rowChan, errChan, doneChan, traceOperatorQueryIndex)
		} else {
			// If the trace operator query is not present, we need to export the data for the first query only
			exportRawDataForSingleQuery(m.querier, contextWithTimeout, orgID, rangeRequest, rowChan, errChan, doneChan, 0)
		}
	}()

	return rowChan, errChan

}

func exportRawDataForSingleQuery(querier querier.Querier, ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest, rowChan chan *qbtypes.RawRow, errChan chan error, doneChan chan any, queryIndex int) {

	query := rangeRequest.CompositeQuery.Queries[queryIndex]
	rowCountLimit := query.GetLimit()
	rowCount := 0

	for rowCount < rowCountLimit {
		chunkSize := min(ChunkSize, rowCountLimit-rowCount)
		query.SetLimit(chunkSize)
		query.SetOffset(rowCount)

		response, err := querier.QueryRange(ctx, orgID, rangeRequest)
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

		rowCount += newRowsCount

		// Stop if we received fewer rows than requested — no more data available
		if newRowsCount < chunkSize {
			return
		}
	}
}

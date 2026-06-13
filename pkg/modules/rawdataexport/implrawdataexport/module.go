package implrawdataexport

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/rawdataexport"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
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
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.CodeNamespace:    "rawdataexport",
		instrumentationtypes.CodeFunctionName: "ExportRawData",
	})

	traceOperatorQueryIndex := rangeRequest.TraceOperatorQueryIndex()

	queries := rangeRequest.CompositeQuery.Queries

	// If the trace operator query is present, mark the queries other than trace operator as disabled
	if traceOperatorQueryIndex > -1 {
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

		if traceOperatorQueryIndex > -1 {
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

	queries := rangeRequest.CompositeQuery.Queries
	clientLimit := queries[queryIndex].GetLimit() // 0 means unlimited
	rowCount := 0

	// Page using the querier's cursor. At large offsets ClickHouse still has to
	// scan and discard every prior row on each chunk. The cursor lets us
	// advance the time window directly.
	queries[queryIndex].SetOffset(0)
	cursor := ""

	for {
		chunkSize := ChunkSize
		if clientLimit > 0 {
			remaining := clientLimit - rowCount
			if remaining <= 0 {
				return
			}
			chunkSize = min(ChunkSize, remaining)
		}

		queries[queryIndex].SetLimit(chunkSize)
		queries[queryIndex].SetCursor(cursor)

		response, err := querier.QueryRange(ctx, orgID, rangeRequest)
		if err != nil {
			errChan <- err
			return
		}

		newRowsCount := 0
		nextCursor := ""
		for _, result := range response.Data.Results {
			resultData, ok := result.(*qbtypes.RawData)
			if !ok {
				errChan <- errors.NewInternalf(errors.CodeInternal, "expected RawData, got %T", result)
				return
			}

			if resultData.NextCursor != "" {
				nextCursor = resultData.NextCursor
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

		// Stop when the querier returns no cursor (last page) or a short chunk.
		if nextCursor == "" || newRowsCount < chunkSize {
			return
		}
		cursor = nextCursor
	}
}

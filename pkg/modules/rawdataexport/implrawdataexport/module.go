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
	for _, query := range rangeRequest.CompositeQuery.Queries {
		if _, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator); ok {
			isTraceOperatorQueryPresent = true
			break
		}
	}

	if isTraceOperatorQueryPresent {
		return exportRawDataForTraceOperatorQuery(m.querier, ctx, orgID, rangeRequest, doneChan)
	}
	return exportRawDataForQueryBuilderQueries(m.querier, ctx, orgID, rangeRequest, doneChan)
}

func exportRawDataForQueryBuilderQueries(querier querier.Querier, ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest, doneChan chan any) (chan *qbtypes.RawRow, chan error) {

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

		compositeQueries := rangeRequest.CompositeQuery.Queries

		appendQueryName := len(compositeQueries) > 1

		for _, query := range compositeQueries {

			dupRangeRequest := rangeRequest.Copy()
			dupRangeRequest.CompositeQuery.Queries = []qbtypes.QueryEnvelope{query}
			switch query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				exportRawDataForQueryBuilderQuery[qbtypes.LogAggregation](querier, contextWithTimeout, orgID, &dupRangeRequest, rowChan, errChan, doneChan, appendQueryName)
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				exportRawDataForQueryBuilderQuery[qbtypes.MetricAggregation](querier, contextWithTimeout, orgID, &dupRangeRequest, rowChan, errChan, doneChan, appendQueryName)
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				exportRawDataForQueryBuilderQuery[qbtypes.TraceAggregation](querier, contextWithTimeout, orgID, &dupRangeRequest, rowChan, errChan, doneChan, appendQueryName)
			default:
				errChan <- errors.NewInternalf(errors.CodeInternal, "unsupported query spec type: %T", query.Spec)
				return
			}
		}
	}()

	return rowChan, errChan

}

func exportRawDataForQueryBuilderQuery[T any](querier querier.Querier, ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest, rowChan chan *qbtypes.RawRow, errChan chan error, doneChan chan any, appendQueryName bool) {
	spec, ok := rangeRequest.CompositeQuery.Queries[0].Spec.(qbtypes.QueryBuilderQuery[T])
	if !ok {
		errChan <- errors.NewInternalf(errors.CodeInternal, "invalid spec type for query builder query")
		return
	}

	rowCountLimit := spec.Limit
	rowCount := 0

	for rowCount < rowCountLimit {
		spec.Limit = min(ChunkSize, rowCountLimit-rowCount)
		spec.Offset = rowCount
		rangeRequest.CompositeQuery.Queries[0].Spec = spec

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
				if appendQueryName {
					row.Data["__query_name"] = spec.Name
				}
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
}

func exportRawDataForTraceOperatorQuery(querier querier.Querier, ctx context.Context, orgID valuer.UUID, rangeRequest *qbtypes.QueryRangeRequest, doneChan chan any) (chan *qbtypes.RawRow, chan error) {

	traceOperatorIndex := 0

	for i, query := range rangeRequest.CompositeQuery.Queries {
		if _, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator); ok {
			traceOperatorIndex = i
			break
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

		spec, ok := rangeRequest.CompositeQuery.Queries[traceOperatorIndex].Spec.(qbtypes.QueryBuilderTraceOperator)
		if !ok {
			errChan <- errors.NewInternalf(errors.CodeInternal, "invalid spec type for query builder trace operator")
			return
		}

		rowCountLimit := spec.Limit
		rowCount := 0

		for rowCount < rowCountLimit {
			spec.Limit = min(ChunkSize, rowCountLimit-rowCount)
			spec.Offset = rowCount
			rangeRequest.CompositeQuery.Queries[traceOperatorIndex].Spec = spec

			response, err := querier.QueryRange(contextWithTimeout, orgID, rangeRequest)
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

package fields

import (
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func parseFieldKeyRequest(r *http.Request) (*telemetrytypes.FieldKeySelector, error) {
	var req telemetrytypes.FieldKeySelector
	var signal telemetrytypes.Signal
	var source telemetrytypes.Source
	var err error

	signalStr := r.URL.Query().Get("signal")
	if signalStr != "" {
		signal = telemetrytypes.Signal{String: valuer.NewString(signalStr)}
	} else {
		signal = telemetrytypes.SignalUnspecified
	}

	sourceStr := r.URL.Query().Get("source")
	if sourceStr != "" {
		source = telemetrytypes.Source{String: valuer.NewString(sourceStr)}
	} else {
		source = telemetrytypes.SourceUnspecified
	}

	if r.URL.Query().Get("limit") != "" {
		limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse limit")
		}
		req.Limit = limit
	} else {
		req.Limit = 1000
	}

	var startUnixMilli, endUnixMilli int64

	if r.URL.Query().Get("startUnixMilli") != "" {
		startUnixMilli, err = strconv.ParseInt(r.URL.Query().Get("startUnixMilli"), 10, 64)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse startUnixMilli")
		}
		// Round down to the nearest 6 hours (21600000 milliseconds)
		startUnixMilli -= startUnixMilli % 21600000
	}
	if r.URL.Query().Get("endUnixMilli") != "" {
		endUnixMilli, err = strconv.ParseInt(r.URL.Query().Get("endUnixMilli"), 10, 64)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse endUnixMilli")
		}
	}

	// Parse fieldContext directly instead of using JSON unmarshalling.
	var fieldContext telemetrytypes.FieldContext
	fieldContextStr := r.URL.Query().Get("fieldContext")
	if fieldContextStr != "" {
		fieldContext = telemetrytypes.FieldContext{String: valuer.NewString(fieldContextStr)}
	}

	// Parse fieldDataType directly instead of using JSON unmarshalling.
	var fieldDataType telemetrytypes.FieldDataType
	fieldDataTypeStr := r.URL.Query().Get("fieldDataType")
	if fieldDataTypeStr != "" {
		fieldDataType = telemetrytypes.FieldDataType{String: valuer.NewString(fieldDataTypeStr)}
	}

	metricName := r.URL.Query().Get("metricName")
	var metricContext *telemetrytypes.MetricContext
	if metricName != "" {
		metricContext = &telemetrytypes.MetricContext{
			MetricName: metricName,
		}
	}

	name := r.URL.Query().Get("searchText")

	req = telemetrytypes.FieldKeySelector{
		StartUnixMilli:    startUnixMilli,
		EndUnixMilli:      endUnixMilli,
		Signal:            signal,
		Source:            source,
		Name:              name,
		FieldContext:      fieldContext,
		FieldDataType:     fieldDataType,
		Limit:             req.Limit,
		SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
		MetricContext:     metricContext,
	}
	return &req, nil
}

func parseFieldValueRequest(r *http.Request) (*telemetrytypes.FieldValueSelector, error) {
	keySelector, err := parseFieldKeyRequest(r)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse field key request")
	}

	name := r.URL.Query().Get("name")
	keySelector.Name = name
	existingQuery := r.URL.Query().Get("existingQuery")
	value := r.URL.Query().Get("searchText")

	// Parse limit for fieldValue request, fallback to default 50 if parsing fails.
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 50
	}

	req := telemetrytypes.FieldValueSelector{
		FieldKeySelector: keySelector,
		ExistingQuery:    existingQuery,
		Value:            value,
		Limit:            limit,
	}

	return &req, nil
}

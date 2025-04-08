package fields

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func ParseFieldKeyRequest(r *http.Request) (*telemetrytypes.FieldKeySelector, error) {
	var req telemetrytypes.FieldKeySelector

	var signal telemetrytypes.Signal
	var err error
	if r.URL.Query().Get("signal") != "" {
		err = json.Unmarshal([]byte(r.URL.Query().Get("signal")), &signal)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse signal")
		}
	} else {
		signal = telemetrytypes.SignalTraces
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
		// round down to the nearest 6 hours
		startUnixMilli = startUnixMilli - (startUnixMilli % 21600000)
	}
	if r.URL.Query().Get("endUnixMilli") != "" {
		endUnixMilli, err = strconv.ParseInt(r.URL.Query().Get("endUnixMilli"), 10, 64)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse endUnixMilli")
		}
	}

	var fieldContext telemetrytypes.FieldContext
	// if the context is not specified, we default to unspecified
	_ = json.Unmarshal([]byte(r.URL.Query().Get("fieldContext")), &fieldContext)

	var fieldDataType telemetrytypes.FieldDataType
	// if the data type is not specified, we default to unspecified
	_ = json.Unmarshal([]byte(r.URL.Query().Get("fieldDataType")), &fieldDataType)

	metricName := r.URL.Query().Get("metricName")

	var metricContext *telemetrytypes.MetricContext
	if metricName != "" {
		metricContext = &telemetrytypes.MetricContext{
			MetricName: metricName,
		}
	}

	name := r.URL.Query().Get("name")

	req = telemetrytypes.FieldKeySelector{
		StartUnixMilli:    startUnixMilli,
		EndUnixMilli:      endUnixMilli,
		Signal:            signal,
		Name:              name,
		FieldContext:      fieldContext,
		FieldDataType:     fieldDataType,
		Limit:             req.Limit,
		SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy,
		MetricContext:     metricContext,
	}
	return &req, nil
}

func ParseFieldValueRequest(r *http.Request) (*telemetrytypes.FieldValueSelector, error) {

	keySelector, err := ParseFieldKeyRequest(r)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse field key request")
	}

	existingQuery := r.URL.Query().Get("existingQuery")

	value := r.URL.Query().Get("value")

	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		limit = 50
	}

	req := telemetrytypes.FieldValueSelector{
		FieldKeySelector: *keySelector,
		ExistingQuery:    existingQuery,
		Value:            value,
		Limit:            limit,
	}

	return &req, nil
}

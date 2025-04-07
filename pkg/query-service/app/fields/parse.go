package fields

import (
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
)

func ParseFieldKeyRequest(r *http.Request) (*types.FieldKeySelector, error) {
	var req types.FieldKeySelector

	signal := types.Signal(r.URL.Query().Get("signal"))

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
	var err error

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

	fieldContext := types.FieldContextFromString(r.URL.Query().Get("fieldContext"))
	fieldDataType := types.FieldDataTypeFromString(r.URL.Query().Get("fieldDataType"))

	metricName := r.URL.Query().Get("metricName")

	var metricContext *types.MetricContext
	if metricName != "" {
		metricContext = &types.MetricContext{
			MetricName: metricName,
		}
	}

	name := r.URL.Query().Get("name")

	req = types.FieldKeySelector{
		StartUnixMilli:    startUnixMilli,
		EndUnixMilli:      endUnixMilli,
		Signal:            signal,
		Name:              name,
		FieldContext:      fieldContext,
		FieldDataType:     fieldDataType,
		Limit:             req.Limit,
		SelectorMatchType: types.FieldSelectorMatchTypeFuzzy,
		MetricContext:     metricContext,
	}
	return &req, nil
}

func ParseFieldValueRequest(r *http.Request) (*types.FieldValueSelector, error) {

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

	req := types.FieldValueSelector{
		FieldKeySelector: *keySelector,
		ExistingQuery:    existingQuery,
		Value:            value,
		Limit:            limit,
	}

	return &req, nil
}

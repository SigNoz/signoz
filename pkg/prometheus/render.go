package prometheus

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/util/stats"
	"github.com/swaggest/jsonschema-go"

	"github.com/SigNoz/signoz/pkg/errors"
)

// This file is the single description of the Prometheus API wire shapes:
// the runtime envelope the handler encodes, and the *Schema types that
// document the same shapes in the generated OpenAPI spec. The contract is
// upstream's (https://prometheus.io/docs/prometheus/latest/querying/api/);
// the schemas describe it, they do not define it.

type errorType string

const (
	errBadData  errorType = "bad_data"
	errExec     errorType = "execution"
	errCanceled errorType = "canceled"
	errTimeout  errorType = "timeout"
	errInternal errorType = "internal"
)

type queryData struct {
	ResultType parser.ValueType `json:"resultType"`
	Result     parser.Value     `json:"result"`
	Stats      stats.QueryStats `json:"stats,omitempty"`
}

type response struct {
	Status    string     `json:"status"`
	Data      *queryData `json:"data,omitempty"`
	ErrorType errorType  `json:"errorType,omitempty"`
	Error     string     `json:"error,omitempty"`
	Warnings  []string   `json:"warnings,omitempty"`
	Infos     []string   `json:"infos,omitempty"`
}

func (h *handler) respond(ctx context.Context, w http.ResponseWriter, data *queryData, warnings, infos []string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(&response{Status: "success", Data: data, Warnings: warnings, Infos: infos}); err != nil {
		h.logger.ErrorContext(ctx, "error writing prometheus api response", errors.Attr(err))
	}
}

// respondError follows Prometheus' status-code mapping: bad_data 400,
// execution 422, canceled/timeout 503, internal 500.
func (h *handler) respondError(ctx context.Context, w http.ResponseWriter, typ errorType, err error) {
	code := http.StatusInternalServerError
	switch typ {
	case errBadData:
		code = http.StatusBadRequest
	case errExec:
		code = http.StatusUnprocessableEntity
	case errCanceled, errTimeout:
		code = http.StatusServiceUnavailable
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if encErr := json.NewEncoder(w).Encode(&response{Status: "error", ErrorType: typ, Error: err.Error()}); encErr != nil {
		h.logger.ErrorContext(ctx, "error writing prometheus api error response", errors.Attr(encErr))
	}
}

// The endpoints accept parameters as URL query params or a form-encoded
// body, on GET and POST alike.
type QueryParamsSchema struct {
	Query   string `query:"query" required:"true" description:"PromQL expression."`
	Time    string `query:"time" description:"Evaluation timestamp: RFC3339 or float unix seconds. Defaults to the server's current time."`
	Timeout string `query:"timeout" description:"Evaluation timeout: duration string or float seconds."`
	Stats   string `query:"stats" description:"Any non-empty value includes query statistics in the response."`
}

type QueryRangeParamsSchema struct {
	Query   string `query:"query" required:"true" description:"PromQL expression."`
	Start   string `query:"start" required:"true" description:"Range start: RFC3339 or float unix seconds."`
	End     string `query:"end" required:"true" description:"Range end: RFC3339 or float unix seconds."`
	Step    string `query:"step" required:"true" description:"Resolution step: duration string or float seconds."`
	Timeout string `query:"timeout" description:"Evaluation timeout: duration string or float seconds."`
	Stats   string `query:"stats" description:"Any non-empty value includes query statistics in the response."`
}

type SuccessResponseSchema struct {
	Status   string          `json:"status" enum:"success" required:"true"`
	Data     QueryDataSchema `json:"data" required:"true"`
	Warnings []string        `json:"warnings,omitempty"`
	Infos    []string        `json:"infos,omitempty"`
}

// QueryDataSchema is the result union, discriminated by resultType.
type QueryDataSchema struct{}

var _ jsonschema.OneOfExposer = QueryDataSchema{}

func (QueryDataSchema) JSONSchemaOneOf() []interface{} {
	return []interface{}{MatrixDataSchema{}, VectorDataSchema{}, ScalarDataSchema{}, StringDataSchema{}}
}

type MatrixDataSchema struct {
	ResultType string               `json:"resultType" enum:"matrix" required:"true"`
	Result     []MatrixSeriesSchema `json:"result" required:"true"`
}

type MatrixSeriesSchema struct {
	Metric map[string]string  `json:"metric" required:"true"`
	Values []SamplePairSchema `json:"values" required:"true"`
}

type VectorDataSchema struct {
	ResultType string               `json:"resultType" enum:"vector" required:"true"`
	Result     []VectorSampleSchema `json:"result" required:"true"`
}

type VectorSampleSchema struct {
	Metric map[string]string `json:"metric" required:"true"`
	Value  SamplePairSchema  `json:"value" required:"true"`
}

type ScalarDataSchema struct {
	ResultType string           `json:"resultType" enum:"scalar" required:"true"`
	Result     SamplePairSchema `json:"result" required:"true"`
}

type StringDataSchema struct {
	ResultType string           `json:"resultType" enum:"string" required:"true"`
	Result     SamplePairSchema `json:"result" required:"true"`
}

// SamplePairSchema is the positional [timestamp, value] pair: a float of
// unix seconds, then the value as a string ("NaN", "+Inf" and "-Inf"
// included). Struct reflection cannot express a positional array, so the
// schema is authored by hand.
type SamplePairSchema struct{}

var _ jsonschema.Exposer = SamplePairSchema{}

func (SamplePairSchema) JSONSchema() (jsonschema.Schema, error) {
	item := jsonschema.Schema{}
	item.WithOneOf(
		(&jsonschema.Schema{}).WithType(jsonschema.Number.Type()).ToSchemaOrBool(),
		(&jsonschema.Schema{}).WithType(jsonschema.String.Type()).ToSchemaOrBool(),
	)
	s := jsonschema.Schema{}
	s.WithType(jsonschema.Array.Type())
	s.WithMinItems(2)
	s.WithMaxItems(2)
	s.WithItems(*(&jsonschema.Items{}).WithSchemaOrBool(item.ToSchemaOrBool()))
	s.WithDescription(`A [timestamp, value] pair: float unix seconds, then the string-encoded sample value ("NaN", "+Inf", "-Inf" included).`)
	return s, nil
}

type ErrorResponseSchema struct {
	Status    string `json:"status" enum:"error" required:"true"`
	ErrorType string `json:"errorType" enum:"bad_data,execution,canceled,timeout,internal" required:"true"`
	Error     string `json:"error" required:"true"`
}

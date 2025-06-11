package querybuildertypesv5

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type QueryEnvelope struct {
	// Type is the type of the query.
	Type QueryType `json:"type"` // "builder_query" | "builder_formula" | "builder_sub_query" | "builder_join" | "promql" | "clickhouse_sql"
	// Spec is the deferred decoding of the query if any.
	Spec any `json:"spec"`
}

// implement custom json unmarshaler for the QueryEnvelope
func (q *QueryEnvelope) UnmarshalJSON(data []byte) error {
	var shadow struct {
		Type QueryType       `json:"type"`
		Spec json.RawMessage `json:"spec"`
	}
	if err := UnmarshalJSONWithSuggestions(data, &shadow); err != nil {
		return err
	}

	q.Type = shadow.Type

	// 2. Decode the spec based on the Type.
	switch shadow.Type {
	case QueryTypeBuilder, QueryTypeSubQuery:
		var header struct {
			Signal telemetrytypes.Signal `json:"signal"`
		}
		if err := json.Unmarshal(shadow.Spec, &header); err != nil {
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"cannot detect builder signal: %v",
				err,
			)
		}

		switch header.Signal {
		case telemetrytypes.SignalTraces:
			var spec QueryBuilderQuery[TraceAggregation]
			if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "query spec"); err != nil {
				// If it's already one of our wrapped errors with additional context, return as-is
				_, _, _, _, _, additionals := errors.Unwrapb(err)
				if len(additionals) > 0 {
					return err
				}
				// Preserve helpful error messages about unknown fields
				if strings.Contains(err.Error(), "unknown field") {
					return err
				}
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid trace builder query spec: %v",
					err,
				)
			}
			q.Spec = spec
		case telemetrytypes.SignalLogs:
			var spec QueryBuilderQuery[LogAggregation]
			if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "query spec"); err != nil {
				// If it's already one of our wrapped errors with additional context, return as-is
				_, _, _, _, _, additionals := errors.Unwrapb(err)
				if len(additionals) > 0 {
					return err
				}
				// Preserve helpful error messages about unknown fields
				if strings.Contains(err.Error(), "unknown field") {
					return err
				}
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid log builder query spec: %v",
					err,
				)
			}
			q.Spec = spec
		case telemetrytypes.SignalMetrics:
			var spec QueryBuilderQuery[MetricAggregation]
			if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "query spec"); err != nil {
				// If it's already one of our wrapped errors with additional context, return as-is
				_, _, _, _, _, additionals := errors.Unwrapb(err)
				if len(additionals) > 0 {
					return err
				}
				// Preserve helpful error messages about unknown fields
				if strings.Contains(err.Error(), "unknown field") {
					return err
				}
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"invalid metric builder query spec: %v",
					err,
				)
			}
			q.Spec = spec
		default:
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown builder signal %q",
				header.Signal,
			).WithAdditional(
				"Valid signals are: traces, logs, metrics",
			)
		}

	case QueryTypeFormula:
		var spec QueryBuilderFormula
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "formula spec"); err != nil {
			// If it's already one of our wrapped errors with additional context, return as-is
			_, _, _, _, _, additionals := errors.Unwrapb(err)
			if len(additionals) > 0 {
				return err
			}
			// Preserve helpful error messages about unknown fields
			if strings.Contains(err.Error(), "unknown field") {
				return err
			}
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid formula spec: %v",
				err,
			)
		}
		q.Spec = spec

	case QueryTypeJoin:
		var spec QueryBuilderJoin
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "join spec"); err != nil {
			// If it's already one of our wrapped errors with additional context, return as-is
			_, _, _, _, _, additionals := errors.Unwrapb(err)
			if len(additionals) > 0 {
				return err
			}
			// Preserve helpful error messages about unknown fields
			if strings.Contains(err.Error(), "unknown field") {
				return err
			}
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid join spec: %v",
				err,
			)
		}
		q.Spec = spec

	case QueryTypePromQL:
		var spec PromQuery
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "PromQL spec"); err != nil {
			// If it's already one of our wrapped errors with additional context, return as-is
			_, _, _, _, _, additionals := errors.Unwrapb(err)
			if len(additionals) > 0 {
				return err
			}
			// Preserve helpful error messages about unknown fields
			if strings.Contains(err.Error(), "unknown field") {
				return err
			}
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid PromQL spec: %v",
				err,
			)
		}
		q.Spec = spec

	case QueryTypeClickHouseSQL:
		var spec ClickHouseQuery
		if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "ClickHouse SQL spec"); err != nil {
			// If it's already one of our wrapped errors with additional context, return as-is
			_, _, _, _, _, additionals := errors.Unwrapb(err)
			if len(additionals) > 0 {
				return err
			}
			// Preserve helpful error messages about unknown fields
			if strings.Contains(err.Error(), "unknown field") {
				return err
			}
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid ClickHouse SQL spec: %v",
				err,
			)
		}
		q.Spec = spec

	default:
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"unknown query type %q",
			shadow.Type,
		).WithAdditional(
			"Valid query types are: builder_query, builder_sub_query, builder_formula, builder_join, promql, clickhouse_sql",
		)
	}

	return nil
}

type CompositeQuery struct {
	// Queries is the queries to use for the request.
	Queries []QueryEnvelope `json:"queries"`
}

// UnmarshalJSON implements custom JSON unmarshaling to provide better error messages
func (c *CompositeQuery) UnmarshalJSON(data []byte) error {
	type Alias CompositeQuery

	// First do a normal unmarshal without DisallowUnknownFields
	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Then check for unknown fields at this level only
	var check map[string]json.RawMessage
	if err := json.Unmarshal(data, &check); err != nil {
		return err
	}

	// Check for unknown fields at this level
	validFields := map[string]bool{
		"queries": true,
	}

	for field := range check {
		if !validFields[field] {
			// Find closest match
			var fieldNames []string
			for f := range validFields {
				fieldNames = append(fieldNames, f)
			}

			if suggestion, found := findClosestMatch(field, fieldNames, 3); found {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"unknown field %q in composite query",
					field,
				).WithAdditional(
					"Did you mean '" + suggestion + "'?",
				)
			}

			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown field %q in composite query",
				field,
			).WithAdditional(
				"Valid fields are: " + strings.Join(fieldNames, ", "),
			)
		}
	}

	*c = CompositeQuery(temp)
	return nil
}

type QueryRangeRequest struct {
	// SchemaVersion is the version of the schema to use for the request payload.
	SchemaVersion string `json:"schemaVersion"`
	// Start is the start time of the query in epoch milliseconds.
	Start uint64 `json:"start"`
	// End is the end time of the query in epoch milliseconds.
	End uint64 `json:"end"`
	// RequestType is the type of the request.
	RequestType RequestType `json:"requestType"`
	// CompositeQuery is the composite query to use for the request.
	CompositeQuery CompositeQuery `json:"compositeQuery"`
	// Variables is the variables to use for the request.
	Variables map[string]any `json:"variables,omitempty"`

	// NoCache is a flag to disable caching for the request.
	NoCache bool `json:"noCache,omitempty"`

	FormatOptions *FormatOptions `json:"formatOptions,omitempty"`
}

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields
func (r *QueryRangeRequest) UnmarshalJSON(data []byte) error {
	// Define a type alias to avoid infinite recursion
	type Alias QueryRangeRequest

	// First do a normal unmarshal without DisallowUnknownFields to let nested structures handle their own validation
	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Then check for unknown fields at this level only
	var check map[string]json.RawMessage
	if err := json.Unmarshal(data, &check); err != nil {
		return err
	}

	// Check for unknown fields at the top level
	validFields := map[string]bool{
		"schemaVersion":  true,
		"start":          true,
		"end":            true,
		"requestType":    true,
		"compositeQuery": true,
		"variables":      true,
		"noCache":        true,
		"formatOptions":  true,
	}

	for field := range check {
		if !validFields[field] {
			// Find closest match
			var fieldNames []string
			for f := range validFields {
				fieldNames = append(fieldNames, f)
			}

			if suggestion, found := findClosestMatch(field, fieldNames, 3); found {
				return errors.NewInvalidInputf(
					errors.CodeInvalidInput,
					"unknown field %q",
					field,
				).WithAdditional(
					"Did you mean '" + suggestion + "'?",
				)
			}

			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"unknown field %q",
				field,
			).WithAdditional(
				"Valid fields are: " + strings.Join(fieldNames, ", "),
			)
		}
	}

	// Copy the decoded values back to the original struct
	*r = QueryRangeRequest(temp)

	return nil
}

type FormatOptions struct {
	FillGaps               bool `json:"fillGaps,omitempty"`
	FormatTableResultForUI bool `json:"formatTableResultForUI,omitempty"`
}

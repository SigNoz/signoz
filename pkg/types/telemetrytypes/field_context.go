package telemetrytypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// FieldContext is the context of the field being queried. It is expected to be used to disambiguate b/w
// different contexts of the same field.
//
// - Use `resource.` prefix to the key to explicitly indicate and enforce resource context. Example
//   - `resource.service.name`
//   - `resource.k8s.namespace.name`
//
// - Use `scope.` prefix to explicitly indicate and enforce scope context. Example
//   - `scope.name`
//   - `scope.version`
//   - `scope.my.custom.attribute` and `scope.attribute.my.custom.attribute` resolve to same attribute
//
// - Use `attribute.` to explicitly indicate and enforce attribute context. Example
//   - `attribute.http.method`
//   - `attribute.http.target`
//
// - Use `event.` to indicate and enforce event context and `event.attribute` to disambiguate b/w `event.name` and `event.attribute.name` . Examples
//   - `event.name` will look for event name
//   - `event.record_entry` will look for `record_entry` attribute in event
//   - `event.attribute.name` will look for `name` attribute event
//
// - Use `span.` to indicate the span context.
//   - `span.name` will resolve to the name of span
//   - `span.kind` will resolve to the kind of span
//   - `span.http.method` will resolve to `http.method` of attribute
//
// - Use `log.` for explicit log context
//   - `log.severity_text` will always resolve to `severity_text` of log record
type FieldContext struct {
	valuer.String
}

var (
	FieldContextMetric      = FieldContext{valuer.NewString("metric")}
	FieldContextLog         = FieldContext{valuer.NewString("log")}
	FieldContextSpan        = FieldContext{valuer.NewString("span")}
	FieldContextTrace       = FieldContext{valuer.NewString("trace")}
	FieldContextResource    = FieldContext{valuer.NewString("resource")}
	FieldContextScope       = FieldContext{valuer.NewString("scope")}
	FieldContextAttribute   = FieldContext{valuer.NewString("attribute")}
	FieldContextEvent       = FieldContext{valuer.NewString("event")}
	FieldContextUnspecified = FieldContext{valuer.NewString("")}

	// Map string representations to FieldContext values
	// We wouldn't need if not for the fact that we have historically used
	// "tag" and "attribute" interchangeably.
	// This means elsewhere in the system, we have used "tag" to refer to "attribute".
	// There are DB entries that use "tag" and "attribute" interchangeably.
	// This is a stop gap measure to ensure that we can still use the existing
	// DB entries.
	fieldContexts = map[string]FieldContext{
		"resource":   FieldContextResource,
		"scope":      FieldContextScope,
		"tag":        FieldContextAttribute,
		"point":      FieldContextAttribute,
		"attribute":  FieldContextAttribute,
		"event":      FieldContextEvent,
		"spanfield":  FieldContextSpan,
		"span":       FieldContextSpan,
		"logfield":   FieldContextLog,
		"log":        FieldContextLog,
		"metric":     FieldContextMetric,
		"tracefield": FieldContextTrace,
	}
)

// UnmarshalJSON implements the json.Unmarshaler interface
func (f *FieldContext) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}

	// Normalize the string
	normalizedStr := strings.ToLower(strings.TrimSpace(str))

	// Look up the context in our map
	if ctx, exists := fieldContexts[normalizedStr]; exists {
		*f = ctx
		return nil
	}

	// Default to unspecified if not found
	*f = FieldContextUnspecified
	return nil
}

// Scan implements the sql.Scanner interface
func (f *FieldContext) Scan(value interface{}) error {
	if f == nil {
		return errors.NewInternalf(errors.CodeInternal, "fieldcontext: nil receiver")
	}

	if value == nil {
		*f = FieldContextUnspecified
		return nil
	}

	str, ok := value.(string)
	if !ok {
		return errors.NewInternalf(errors.CodeInternal, "fieldcontext: expected string, got %T", value)
	}

	// Normalize the string
	normalizedStr := strings.ToLower(strings.TrimSpace(str))

	// Look up the context in our map
	if ctx, exists := fieldContexts[normalizedStr]; exists {
		*f = ctx
		return nil
	}

	// Default to unspecified if not found
	*f = FieldContextUnspecified
	return nil
}

// TagType returns the tag type for the field context.
func (f FieldContext) TagType() string {
	switch f {
	case FieldContextResource:
		return "resource"
	case FieldContextScope:
		return "scope"
	case FieldContextAttribute:
		return "tag"
	case FieldContextLog:
		return "logfield"
	case FieldContextSpan:
		return "spanfield"
	case FieldContextTrace:
		return "tracefield"
	case FieldContextMetric:
		return "metricfield"
	case FieldContextEvent:
		return "eventfield"
	}
	return ""
}

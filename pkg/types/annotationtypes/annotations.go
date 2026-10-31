package annotationtypes

import (
	"encoding/json"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
)

var ValidSignals = []telemetrytypes.Signal{telemetrytypes.SignalTraces, telemetrytypes.SignalLogs}

type AnnotationKind struct {
	valuer.String
}

var (
	AnnotationKindDeployment = AnnotationKind{valuer.NewString("deployment")}
)

func (AnnotationKind) Enum() []any {
	return []any{
		AnnotationKindDeployment,
	}
}

type Annotations struct {
	Records              []Annotation `json:"records" required:"true"`
	Total                int          `json:"total" required:"true"`
	HistoryAvailableFrom int64        `json:"historyAvailableFrom" required:"true"`
}

type Annotation struct {
	Kind AnnotationKind `json:"kind" required:"true"`
	Spec any            `json:"spec" required:"true"`
}

type PostableAnnotations struct {
	Kind    AnnotationKind          `json:"kind" required:"true"`
	Start   int64                   `json:"start" required:"true"`
	End     int64                   `json:"end" required:"true"`
	Signals []telemetrytypes.Signal `json:"signals"`
	Filter  *qbtypes.Filter         `json:"filter"`
	Limit   int                     `json:"limit" required:"true"`
}

var (
	_ jsonschema.OneOfExposer = Annotation{}
	_ jsonschema.Preparer     = Annotation{}
)

// annotationDeployment is the OpenAPI schema for an Annotation with kind=deployment.
type annotationDeployment struct {
	Kind AnnotationKind `json:"kind" required:"true"`
	Spec DeploymentSpec `json:"spec" required:"true"`
}

func (Annotation) JSONSchemaOneOf() []any {
	return []any{
		annotationDeployment{},
	}
}

func (Annotation) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}

	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "kind",
		"mapping": map[string]string{
			AnnotationKindDeployment.StringValue(): "#/components/schemas/AnnotationtypesAnnotationDeployment",
		},
	}

	return nil
}

func (req *PostableAnnotations) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Kind != AnnotationKindDeployment {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid kind %q: only %q is supported", req.Kind.StringValue(), AnnotationKindDeployment.StringValue())
	}

	if req.Start <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time %d: start must be greater than 0", req.Start)
	}

	if req.End <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end time %d: end must be greater than 0", req.End)
	}

	if req.Start >= req.End {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid time range: start (%d) must be less than end (%d)", req.Start, req.End)
	}

	for _, signal := range req.Signals {
		if !slices.Contains(ValidSignals, signal) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid signal %q: must be one of %q, %q", signal.StringValue(), telemetrytypes.SignalTraces.StringValue(), telemetrytypes.SignalLogs.StringValue())
		}
	}

	if req.Limit < 1 || req.Limit > 5000 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be between 1 and 5000")
	}

	return nil
}

// UnmarshalJSON validates input immediately after decoding.
func (req *PostableAnnotations) UnmarshalJSON(data []byte) error {
	type raw PostableAnnotations
	var decoded raw
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*req = PostableAnnotations(decoded)
	return req.Validate()
}

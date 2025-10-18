package spanpercentiletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
)

type SpanPercentileRequest struct {
	SpanID                  string   `json:"span_id"`
	Start                   uint64   `json:"start"`
	End                     uint64   `json:"end"`
	AdditionalResourceAttrs []string `json:"additional_resource_attrs,omitempty"`
}

func (req *SpanPercentileRequest) Validate() error {
	if req.SpanID == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "span_id is required")
	}

	if req.Start >= req.End {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "start time must be before end time")
	}

	for _, attr := range req.AdditionalResourceAttrs {
		if attr == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "resource attribute cannot be empty")
		}
	}

	return nil
}

package spanpercentiletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type SpanPercentileRequest struct {
	SpanID string          `json:"span_id"`
	Start  uint64          `json:"start"`
	End    uint64          `json:"end"`
	Filter *qbtypes.Filter `json:"filters,omitempty"`
}

// Validate validates the SpanPercentileRequest
func (req *SpanPercentileRequest) Validate() error {
	if req.SpanID == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "span_id is required")
	}

	if req.Start >= req.End {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "start time must be before end time")
	}

	if req.Filter != nil && req.Filter.Expression == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "filter expression cannot be empty when filter is provided")
	}

	return nil
}

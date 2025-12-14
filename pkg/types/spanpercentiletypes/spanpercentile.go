package spanpercentiletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
)

type SpanPercentileRequest struct {
	DurationNano       int64             `json:"spanDuration"`
	Name               string            `json:"name"`
	ServiceName        string            `json:"serviceName"`
	ResourceAttributes map[string]string `json:"resourceAttributes"`
	Start              uint64            `json:"start"`
	End                uint64            `json:"end"`
}

func (req *SpanPercentileRequest) Validate() error {
	if req.Name == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "name is required")
	}

	if req.ServiceName == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "service_name is required")
	}

	if req.DurationNano <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "duration_nano must be greater than 0")
	}

	if req.Start >= req.End {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "start time must be before end time")
	}

	for key, val := range req.ResourceAttributes {
		if key == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "resource attribute key cannot be empty")
		}
		if val == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "resource attribute value cannot be empty")
		}
	}

	return nil
}

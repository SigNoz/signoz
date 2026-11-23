package spanpercentiletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
)

type SpanPercentileRequest struct {
	DurationNano       int64             `json:"spanDuration" required:"true" description:"The span's duration, in nanoseconds."`
	Name               string            `json:"name" required:"true"`
	ServiceName        string            `json:"serviceName" required:"true"`
	ResourceAttributes map[string]string `json:"resourceAttributes" nullable:"true" description:"Narrows the compared spans to those with these resource attributes."`
	Start              uint64            `json:"start" required:"true" description:"The start of the time range, in milliseconds since the Unix epoch."`
	End                uint64            `json:"end" required:"true" description:"The end of the time range, in milliseconds since the Unix epoch."`
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

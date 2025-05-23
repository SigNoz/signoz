package tracefunnel

import (
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ValidateTimestamp validates a timestamp
func ValidateTimestamp(timestamp int64, fieldName string) error {
	if timestamp == 0 {
		return fmt.Errorf("%s is required", fieldName)
	}
	if timestamp < 0 {
		return fmt.Errorf("%s must be positive", fieldName)
	}
	return nil
}

// ValidateTimestampIsMilliseconds validates that a timestamp is in milliseconds
func ValidateTimestampIsMilliseconds(timestamp int64) bool {
	return timestamp >= 1000000000000 && timestamp <= 9999999999999
}

func ValidateFunnelSteps(steps []*FunnelStep) error {
	if len(steps) < 2 {
		return fmt.Errorf("funnel must have at least 2 steps")
	}

	for i, step := range steps {
		if step.ServiceName == "" {
			return fmt.Errorf("step %d: service name is required", i+1)
		}
		if step.SpanName == "" {
			return fmt.Errorf("step %d: span name is required", i+1)
		}
		if step.Order < 0 {
			return fmt.Errorf("step %d: order must be non-negative", i+1)
		}
	}

	return nil
}

// NormalizeFunnelSteps normalizes step orders to be sequential starting from 1.
// Returns a new slice with normalized step orders, leaving the input slice unchanged.
func NormalizeFunnelSteps(steps []*FunnelStep) []*FunnelStep {
	if len(steps) == 0 {
		return []*FunnelStep{}
	}

	newSteps := make([]*FunnelStep, len(steps))
	copy(newSteps, steps)

	sort.Slice(newSteps, func(i, j int) bool {
		return newSteps[i].Order < newSteps[j].Order
	})

	for i := range newSteps {
		newSteps[i].Order = int64(i + 1)
	}

	return newSteps
}

func GetClaims(r *http.Request) (*authtypes.Claims, error) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"unauthenticated")
	}
	return &claims, nil
}

func ValidateAndConvertTimestamp(timestamp int64) (time.Time, error) {
	if err := ValidateTimestamp(timestamp, "timestamp"); err != nil {
		return time.Time{}, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"timestamp is invalid: %v", err)
	}
	return time.Unix(0, timestamp*1000000), nil // Convert to nanoseconds
}

func ConstructFunnelResponse(funnel *StorableFunnel, claims *authtypes.Claims) GettableFunnel {
	resp := GettableFunnel{
		FunnelName:  funnel.Name,
		FunnelID:    funnel.ID.String(),
		Steps:       funnel.Steps,
		CreatedAt:   funnel.CreatedAt.UnixNano() / 1000000,
		CreatedBy:   funnel.CreatedBy,
		OrgID:       funnel.OrgID.String(),
		UpdatedBy:   funnel.UpdatedBy,
		UpdatedAt:   funnel.UpdatedAt.UnixNano() / 1000000,
		Description: funnel.Description,
	}

	if funnel.CreatedByUser != nil {
		resp.UserEmail = funnel.CreatedByUser.Email
	} else if claims != nil {
		resp.UserEmail = claims.Email
	}

	return resp
}

func ProcessFunnelSteps(steps []*FunnelStep) ([]*FunnelStep, error) {
	// First validate the steps
	if err := ValidateFunnelSteps(steps); err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"invalid funnel steps: %v", err)
	}

	// Then process the steps
	for i := range steps {
		if steps[i].Order < 1 {
			steps[i].Order = int64(i + 1)
		}
		if steps[i].ID.IsZero() {
			steps[i].ID = valuer.GenerateUUID()
		}
	}

	return NormalizeFunnelSteps(steps), nil
}

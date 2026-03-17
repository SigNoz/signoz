package tracefunneltypes

import (
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ValidateTimestamp validates a timestamp
func ValidateTimestamp(timestamp int64, fieldName string) error {
	if timestamp == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "%s is required", fieldName)
	}
	if timestamp < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "%s must be positive", fieldName)
	}
	return nil
}

// ValidateTimestampIsMilliseconds validates that a timestamp is in milliseconds
func ValidateTimestampIsMilliseconds(timestamp int64) bool {
	return timestamp >= 1000000000000 && timestamp <= 9999999999999
}

func ValidateFunnelSteps(steps []*FunnelStep) error {
	if len(steps) < 2 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "funnel must have at least 2 steps")
	}

	for i, step := range steps {
		if step.ServiceName == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "step %d: service name is required", i+1)
		}
		if step.SpanName == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "step %d: span name is required", i+1)
		}
		if step.Order < 0 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "step %d: order must be non-negative", i+1)
		}
	}

	return nil
}

// NormalizeFunnelSteps normalizes step orders to be sequential starting from 1.
// The function takes a slice of pointers to FunnelStep and returns a new slice with normalized step orders.
// The input slice is left unchanged. If the input slice contains nil pointers, they will be filtered out.
// Returns an empty slice if the input is empty or contains only nil pointers.
func NormalizeFunnelSteps(steps []*FunnelStep) []*FunnelStep {
	if len(steps) == 0 {
		return []*FunnelStep{}
	}

	// Filter out nil pointers and create a new slice
	validSteps := make([]*FunnelStep, 0, len(steps))
	for _, step := range steps {
		if step != nil {
			validSteps = append(validSteps, step)
		}
	}

	if len(validSteps) == 0 {
		return []*FunnelStep{}
	}

	// Create a defensive copy of the valid steps
	newSteps := make([]*FunnelStep, len(validSteps))
	for i, step := range validSteps {
		// Create a copy of each step to avoid modifying the original
		stepCopy := *step
		newSteps[i] = &stepCopy
	}

	sort.Slice(newSteps, func(i, j int) bool {
		return newSteps[i].Order < newSteps[j].Order
	})

	for i := range newSteps {
		newSteps[i].Order = int64(i + 1)
	}

	return newSteps
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
		resp.UserEmail = funnel.CreatedByUser.Email.String()
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

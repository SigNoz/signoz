package telemetrytypes

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var errCodeInvalidResourceID = errors.MustNewCode("invalid_resource_id")

var PrefixSelector coretypes.SelectorFunc = func(_ context.Context, resource coretypes.Resource, id string, _ valuer.UUID) ([]coretypes.Selector, error) {
	if id == "" {
		return nil, errors.Newf(
			errors.TypeInvalidInput,
			errCodeInvalidResourceID,
			"resource id is required for %s",
			resource.Kind().String(),
		)
	}

	segments := strings.Split(id, "/")
	values := make([]string, 0, len(segments)+1)
	values = append(values, id)
	for level := len(segments) - 1; level >= 1; level-- {
		values = append(values, strings.Join(segments[:level], "/")+"/*")
	}
	values = append(values, coretypes.WildCardSelectorString)

	selectors := make([]coretypes.Selector, 0, len(values))
	for _, value := range values {
		selector, err := resource.Type().Selector(value)
		if err != nil {
			return nil, err
		}
		selectors = append(selectors, selector)
	}

	return selectors, nil
}

// Must stay stable: grant-time callers rely on producing the same segment for the same input.
func selectorSegment(input string) string {
	normalized := strings.Join(strings.Fields(input), " ")
	sum := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(sum[:16])
}

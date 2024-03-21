package ottlfunctions

import (
	"context"
	"testing"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
	"github.com/stretchr/testify/assert"
)

func TestHexToInt(t *testing.T) {
	tests := []struct {
		name        string
		target      string
		expected    int64
		shouldError bool
	}{
		{
			name:        "value with prefix",
			target:      "0xaB",
			expected:    int64(171),
			shouldError: false,
		}, {
			name:        "value without prefix",
			target:      "ab",
			expected:    int64(171),
			shouldError: false,
		}, {
			name:        "odd length value",
			target:      "aAa",
			expected:    int64(2730),
			shouldError: false,
		}, {
			name:        "non-hex value",
			target:      "zz",
			shouldError: true,
			expected:    0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			target := ottl.StandardStringGetter[any]{
				Getter: func(ctx context.Context, tCtx any) (interface{}, error) {
					return tt.target, nil
				},
			}

			fn, err := hexToInt(target)
			assert.NoError(t, err)

			result, err := fn(context.Background(), nil)
			if tt.shouldError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, result, tt.expected)
			}
		})
	}
}

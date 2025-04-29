package tracefunnel

import (
	"testing"
	"time"

	tracefunnel "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestValidateTimestamp(t *testing.T) {
	tests := []struct {
		name        string
		timestamp   int64
		fieldName   string
		expectError bool
	}{
		{
			name:        "valid timestamp",
			timestamp:   time.Now().UnixMilli(),
			fieldName:   "timestamp",
			expectError: false,
		},
		{
			name:        "zero timestamp",
			timestamp:   0,
			fieldName:   "timestamp",
			expectError: true,
		},
		{
			name:        "negative timestamp",
			timestamp:   -1,
			fieldName:   "timestamp",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTimestamp(tt.timestamp, tt.fieldName)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateTimestampIsMilliseconds(t *testing.T) {
	tests := []struct {
		name      string
		timestamp int64
		expected  bool
	}{
		{
			name:      "valid millisecond timestamp",
			timestamp: 1700000000000, // 2023-11-14 12:00:00 UTC
			expected:  true,
		},
		{
			name:      "too small timestamp",
			timestamp: 999999999999,
			expected:  false,
		},
		{
			name:      "too large timestamp",
			timestamp: 10000000000000,
			expected:  false,
		},
		{
			name:      "second precision timestamp",
			timestamp: 1700000000,
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateTimestampIsMilliseconds(tt.timestamp)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateFunnelSteps(t *testing.T) {
	tests := []struct {
		name        string
		steps       []tracefunnel.FunnelStep
		expectError bool
	}{
		{
			name: "valid steps",
			steps: []tracefunnel.FunnelStep{
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expectError: false,
		},
		{
			name: "too few steps",
			steps: []tracefunnel.FunnelStep{
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
			},
			expectError: true,
		},
		{
			name: "missing service name",
			steps: []tracefunnel.FunnelStep{
				{
					Id:       valuer.GenerateUUID(),
					Name:     "Step 1",
					SpanName: "test-span",
					Order:    1,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expectError: true,
		},
		{
			name: "missing span name",
			steps: []tracefunnel.FunnelStep{
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					Order:       1,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expectError: true,
		},
		{
			name: "negative order",
			steps: []tracefunnel.FunnelStep{
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       -1,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateFunnelSteps(tt.steps)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNormalizeFunnelSteps(t *testing.T) {
	tests := []struct {
		name     string
		steps    []tracefunnel.FunnelStep
		expected []tracefunnel.FunnelStep
	}{
		{
			name: "already normalized steps",
			steps: []tracefunnel.FunnelStep{
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expected: []tracefunnel.FunnelStep{
				{
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
		},
		{
			name: "unordered steps",
			steps: []tracefunnel.FunnelStep{
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
			},
			expected: []tracefunnel.FunnelStep{
				{
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
		},
		{
			name: "steps with gaps in order",
			steps: []tracefunnel.FunnelStep{
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 3",
					ServiceName: "test-service",
					SpanName:    "test-span-3",
					Order:       3,
				},
				{
					Id:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expected: []tracefunnel.FunnelStep{
				{
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
				{
					Name:        "Step 3",
					ServiceName: "test-service",
					SpanName:    "test-span-3",
					Order:       3,
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Make a copy of the steps to avoid modifying the original
			steps := make([]tracefunnel.FunnelStep, len(tt.steps))
			copy(steps, tt.steps)

			result := NormalizeFunnelSteps(steps)

			// Compare only the relevant fields
			for i := range result {
				assert.Equal(t, tt.expected[i].Name, result[i].Name)
				assert.Equal(t, tt.expected[i].ServiceName, result[i].ServiceName)
				assert.Equal(t, tt.expected[i].SpanName, result[i].SpanName)
				assert.Equal(t, tt.expected[i].Order, result[i].Order)
			}
		})
	}
}

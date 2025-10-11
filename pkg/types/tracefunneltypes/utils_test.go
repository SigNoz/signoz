package tracefunneltypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
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
		steps       []*FunnelStep
		expectError bool
	}{
		{
			name: "valid steps",
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					ID:          valuer.GenerateUUID(),
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
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
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
			steps: []*FunnelStep{
				{
					ID:       valuer.GenerateUUID(),
					Name:     "Step 1",
					SpanName: "test-span",
					Order:    1,
				},
				{
					ID:          valuer.GenerateUUID(),
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
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					Order:       1,
				},
				{
					ID:          valuer.GenerateUUID(),
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
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       -1,
				},
				{
					ID:          valuer.GenerateUUID(),
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
		steps    []*FunnelStep
		expected []*FunnelStep
	}{
		{
			name: "already normalized steps",
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expected: []*FunnelStep{
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
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
			},
			expected: []*FunnelStep{
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
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 3",
					ServiceName: "test-service",
					SpanName:    "test-span-3",
					Order:       3,
				},
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expected: []*FunnelStep{
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
		{
			name: "steps with nil pointers",
			steps: []*FunnelStep{
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       1,
				},
				nil,
				{
					ID:          valuer.GenerateUUID(),
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expected: []*FunnelStep{
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
			name:     "empty steps",
			steps:    []*FunnelStep{},
			expected: []*FunnelStep{},
		},
		{
			name:     "all nil steps",
			steps:    []*FunnelStep{nil, nil},
			expected: []*FunnelStep{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeFunnelSteps(tt.steps)

			// Compare only the relevant fields
			assert.Len(t, result, len(tt.expected))
			for i := range result {
				assert.Equal(t, tt.expected[i].Name, result[i].Name)
				assert.Equal(t, tt.expected[i].ServiceName, result[i].ServiceName)
				assert.Equal(t, tt.expected[i].SpanName, result[i].SpanName)
				assert.Equal(t, tt.expected[i].Order, result[i].Order)
			}
		})
	}
}

func TestValidateAndConvertTimestamp(t *testing.T) {
	tests := []struct {
		name        string
		timestamp   int64
		expectError bool
	}{
		{
			name:        "valid timestamp",
			timestamp:   time.Now().UnixMilli(),
			expectError: false,
		},
		{
			name:        "zero timestamp",
			timestamp:   0,
			expectError: true,
		},
		{
			name:        "negative timestamp",
			timestamp:   -1,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateAndConvertTimestamp(tt.timestamp)
			if tt.expectError {
				assert.Error(t, err)
				assert.True(t, result.IsZero())
			} else {
				assert.NoError(t, err)
				assert.False(t, result.IsZero())
				// Verify the conversion from milliseconds to nanoseconds
				assert.Equal(t, tt.timestamp*1000000, result.UnixNano())
			}
		})
	}
}

func TestConstructFunnelResponse(t *testing.T) {
	now := time.Now()
	funnelID := valuer.GenerateUUID()
	orgID := valuer.GenerateUUID()
	userID := valuer.GenerateUUID()

	tests := []struct {
		name     string
		funnel   *StorableFunnel
		claims   *authtypes.Claims
		expected GettableFunnel
	}{
		{
			name: "with user email from funnel",
			funnel: &StorableFunnel{
				Identifiable: types.Identifiable{
					ID: funnelID,
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: now,
					UpdatedAt: now,
				},
				UserAuditable: types.UserAuditable{
					CreatedBy: userID.String(),
					UpdatedBy: userID.String(),
				},
				Name:  "test-funnel",
				OrgID: orgID,
				CreatedByUser: &types.User{
					Identifiable: types.Identifiable{
						ID: userID,
					},
					Email: valuer.MustNewEmail("funnel@example.com"),
				},
				Steps: []*FunnelStep{
					{
						ID:          valuer.GenerateUUID(),
						Name:        "Step 1",
						ServiceName: "test-service",
						SpanName:    "test-span",
						Order:       1,
					},
				},
			},
			claims: &authtypes.Claims{
				UserID: userID.String(),
				OrgID:  orgID.String(),
				Email:  "claims@example.com",
			},
			expected: GettableFunnel{
				FunnelName: "test-funnel",
				FunnelID:   funnelID.String(),
				Steps: []*FunnelStep{
					{
						Name:        "Step 1",
						ServiceName: "test-service",
						SpanName:    "test-span",
						Order:       1,
					},
				},
				CreatedAt: now.UnixNano() / 1000000,
				CreatedBy: userID.String(),
				UpdatedAt: now.UnixNano() / 1000000,
				UpdatedBy: userID.String(),
				OrgID:     orgID.String(),
				UserEmail: "funnel@example.com",
			},
		},
		{
			name: "with user email from claims",
			funnel: &StorableFunnel{
				Identifiable: types.Identifiable{
					ID: funnelID,
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: now,
					UpdatedAt: now,
				},
				UserAuditable: types.UserAuditable{
					CreatedBy: userID.String(),
					UpdatedBy: userID.String(),
				},
				Name:  "test-funnel",
				OrgID: orgID,
				Steps: []*FunnelStep{
					{
						ID:          valuer.GenerateUUID(),
						Name:        "Step 1",
						ServiceName: "test-service",
						SpanName:    "test-span",
						Order:       1,
					},
				},
			},
			claims: &authtypes.Claims{
				UserID: userID.String(),
				OrgID:  orgID.String(),
				Email:  "claims@example.com",
			},
			expected: GettableFunnel{
				FunnelName: "test-funnel",
				FunnelID:   funnelID.String(),
				Steps: []*FunnelStep{
					{
						Name:        "Step 1",
						ServiceName: "test-service",
						SpanName:    "test-span",
						Order:       1,
					},
				},
				CreatedAt: now.UnixNano() / 1000000,
				CreatedBy: userID.String(),
				UpdatedAt: now.UnixNano() / 1000000,
				UpdatedBy: userID.String(),
				OrgID:     orgID.String(),
				UserEmail: "claims@example.com",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ConstructFunnelResponse(tt.funnel, tt.claims)

			// Compare top-level fields
			assert.Equal(t, tt.expected.FunnelName, result.FunnelName)
			assert.Equal(t, tt.expected.FunnelID, result.FunnelID)
			assert.Equal(t, tt.expected.CreatedAt, result.CreatedAt)
			assert.Equal(t, tt.expected.CreatedBy, result.CreatedBy)
			assert.Equal(t, tt.expected.UpdatedAt, result.UpdatedAt)
			assert.Equal(t, tt.expected.UpdatedBy, result.UpdatedBy)
			assert.Equal(t, tt.expected.OrgID, result.OrgID)
			assert.Equal(t, tt.expected.UserEmail, result.UserEmail)

			// Compare steps
			assert.Len(t, result.Steps, len(tt.expected.Steps))
			for i, step := range result.Steps {
				expectedStep := tt.expected.Steps[i]
				assert.Equal(t, expectedStep.Name, step.Name)
				assert.Equal(t, expectedStep.ServiceName, step.ServiceName)
				assert.Equal(t, expectedStep.SpanName, step.SpanName)
				assert.Equal(t, expectedStep.Order, step.Order)
			}
		})
	}
}

func TestProcessFunnelSteps(t *testing.T) {
	tests := []struct {
		name        string
		steps       []*FunnelStep
		expectError bool
	}{
		{
			name: "valid steps with missing IDs",
			steps: []*FunnelStep{
				{
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       0, // Will be normalized to 1
				},
				{
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       0, // Will be normalized to 2
				},
			},
			expectError: false,
		},
		{
			name: "invalid steps - missing service name",
			steps: []*FunnelStep{
				{
					Name:     "Step 1",
					SpanName: "test-span",
					Order:    1,
				},
				{
					Name:        "Step 2",
					ServiceName: "test-service",
					SpanName:    "test-span-2",
					Order:       2,
				},
			},
			expectError: true,
		},
		{
			name: "invalid steps - negative order",
			steps: []*FunnelStep{
				{
					Name:        "Step 1",
					ServiceName: "test-service",
					SpanName:    "test-span",
					Order:       -1,
				},
				{
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
			result, err := ProcessFunnelSteps(tt.steps)
			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Len(t, result, len(tt.steps))

				// Verify IDs are generated
				for _, step := range result {
					assert.False(t, step.ID.IsZero())
				}

				// Verify orders are normalized
				for i, step := range result {
					assert.Equal(t, int64(i+1), step.Order)
				}
			}
		})
	}
}

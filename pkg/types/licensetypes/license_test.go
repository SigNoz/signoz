package licensetypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewLicenseV3(t *testing.T) {
	testCases := []struct {
		name     string
		data     []byte
		pass     bool
		expected *License
		error    error
	}{
		{
			name:  "Error for missing license id",
			data:  []byte(`{}`),
			pass:  false,
			error: errors.New("id key is missing"),
		},
		{
			name:  "Error for license id not being a valid string",
			data:  []byte(`{"id": 10}`),
			pass:  false,
			error: errors.New("id key is not a valid string"),
		},
		{
			name:  "Error for missing license key",
			data:  []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e"}`),
			pass:  false,
			error: errors.New("key key is missing"),
		},
		{
			name:  "Error for invalid string license key",
			data:  []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":10}`),
			pass:  false,
			error: errors.New("key key is not a valid string"),
		},
		{
			name:  "Error for missing license status",
			data:  []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e", "key": "does-not-matter","category":"FREE"}`),
			pass:  false,
			error: errors.New("status key is missing"),
		},
		{
			name:  "Error for invalid string license status",
			data:  []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key": "does-not-matter", "category":"FREE", "status":10}`),
			pass:  false,
			error: errors.New("status key is not a valid string"),
		},
		{
			name:  "Error for missing license plan",
			data:  []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","category":"FREE","status":"ACTIVE"}`),
			pass:  false,
			error: errors.New("plan key is missing"),
		},
		{
			name:  "Error for invalid json license plan",
			data:  []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":10}`),
			pass:  false,
			error: errors.New("plan key is not a valid map[string]interface {}"),
		},
		{
			name:  "Error for invalid license plan",
			data:  []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{}}`),
			pass:  false,
			error: errors.New("name key is missing"),
		},
		{
			name: "Parse the entire license properly",
			data: []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{"name":"ENTERPRISE"},"valid_from": 1730899309,"valid_until": -1,"state":"test","free_until":"2025-05-16T11:17:48.124202Z"}`),
			pass: true,
			expected: &License{
				ID:  valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"),
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "ENTERPRISE",
					},
					"category":    "FREE",
					"status":      "ACTIVE",
					"valid_from":  float64(1730899309),
					"valid_until": float64(-1),
					"state":       "test",
					"free_until":  "2025-05-16T11:17:48.124202Z",
				},
				PlanName:       PlanNameEnterprise,
				ValidFrom:      1730899309,
				ValidUntil:     -1,
				Status:         valuer.NewString("ACTIVE"),
				State:          "test",
				FreeUntil:      time.Date(2025, 5, 16, 11, 17, 48, 124202000, time.UTC),
				Features:       make([]*Feature, 0),
				OrganizationID: valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"),
			},
		},
		{
			name: "Fallback to basic plan if license status is invalid",
			data: []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","category":"FREE","status":"INVALID","plan":{"name":"ENTERPRISE"},"valid_from": 1730899309,"valid_until": -1}`),
			pass: true,
			expected: &License{
				ID:  valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"),
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "ENTERPRISE",
					},
					"category":    "FREE",
					"status":      "INVALID",
					"valid_from":  float64(1730899309),
					"valid_until": float64(-1),
				},
				PlanName:       PlanNameBasic,
				ValidFrom:      1730899309,
				ValidUntil:     -1,
				Status:         valuer.NewString("INVALID"),
				Features:       make([]*Feature, 0),
				OrganizationID: valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"),
			},
		},
		{
			name: "fallback states for validFrom and validUntil",
			data: []byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{"name":"ENTERPRISE"},"valid_from":1234.456,"valid_until":5678.567}`),
			pass: true,
			expected: &License{
				ID:  valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"),
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "ENTERPRISE",
					},
					"valid_from":  1234.456,
					"valid_until": 5678.567,
					"category":    "FREE",
					"status":      "ACTIVE",
				},
				PlanName:        PlanNameEnterprise,
				ValidFrom:       1234,
				ValidUntil:      5678,
				Status:          valuer.NewString("ACTIVE"),
				Features:        make([]*Feature, 0),
				CreatedAt:       time.Time{},
				UpdatedAt:       time.Time{},
				LastValidatedAt: time.Time{},
				OrganizationID:  valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"),
			},
		},
	}

	for _, tc := range testCases {
		license, err := NewLicense(tc.data, valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"))
		if license != nil {
			license.Features = make([]*Feature, 0)
			delete(license.Data, "features")
		}

		if tc.pass {
			require.NoError(t, err)
			require.NotNil(t, license)
			// as the new license will pick the time.Now() value. doesn't make sense to compare them
			license.CreatedAt = time.Time{}
			license.UpdatedAt = time.Time{}
			license.LastValidatedAt = time.Time{}
			assert.Equal(t, tc.expected, license)
		} else {
			require.Error(t, err)
			assert.EqualError(t, err, tc.error.Error())
			require.Nil(t, license)
		}

	}
}

package model

import (
	"encoding/json"
	"testing"

	"github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func TestNewLicenseV3(t *testing.T) {
	testCases := []struct {
		name     string
		data     []byte
		pass     bool
		expected *LicenseV3
		error    error
	}{
		{
			name:  "Error for missing license id",
			data:  []byte(`{}`),
			pass:  false,
			error: errors.New("license id is missing"),
		},
		{
			name:  "Error for license id not being a valid string",
			data:  []byte(`{"id": 10}`),
			pass:  false,
			error: errors.New("license id is not a valid string"),
		},
		{
			name:  "Error for missing license key",
			data:  []byte(`{"id":"does-not-matter"}`),
			pass:  false,
			error: errors.New("license key is missing"),
		},
		{
			name:  "Error for invalid string license key",
			data:  []byte(`{"id":"does-not-matter","key":10}`),
			pass:  false,
			error: errors.New("license key is not a valid string"),
		},
		{
			name:  "Error for missing license category",
			data:  []byte(`{"id":"does-not-matter", "key": "does-not-matter"}`),
			pass:  false,
			error: errors.New("license category is missing"),
		},
		{
			name:  "Error for invalid string license category",
			data:  []byte(`{"id":"does-not-matter","key": "does-not-matter", "category":10}`),
			pass:  false,
			error: errors.New("license category is not a valid string"),
		},
		{
			name:  "Error for missing license status",
			data:  []byte(`{"id":"does-not-matter", "key": "does-not-matter","category":"FREE"}`),
			pass:  false,
			error: errors.New("license status is missing"),
		},
		{
			name:  "Error for invalid string license status",
			data:  []byte(`{"id":"does-not-matter","key": "does-not-matter", "category":"FREE", "status":10}`),
			pass:  false,
			error: errors.New("license status is not a valid string"),
		},
		{
			name:  "Error for missing license plan",
			data:  []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE"}`),
			pass:  false,
			error: errors.New("license plan is missing"),
		},
		{
			name:  "Error for invalid json license plan",
			data:  []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":10}`),
			pass:  false,
			error: errors.New("failed to unmarshal plan data: json: cannot unmarshal number into Go value of type model.Plan"),
		},
		{
			name:  "Error for invalid license plan",
			data:  []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{}}`),
			pass:  false,
			error: errors.New("license plan is missing plan name"),
		},
		{
			name: "Parse the entire license properly",
			data: []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{"name":"TEAMS"},"valid_from": 1730899309,"valid_until": -1}`),
			pass: true,
			expected: &LicenseV3{
				ID:  "does-not-matter",
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "TEAMS",
					},
					"category":    "FREE",
					"status":      "ACTIVE",
					"valid_from":  float64(1730899309),
					"valid_until": float64(-1),
				},
				Plan: Plan{
					Name: PlanNameTeams,
				},
				ValidFrom:  1730899309,
				ValidUntil: -1,
				Status:     "ACTIVE",
				Category:   "FREE",
				IsCurrent:  false,
				Features:   model.FeatureSet{},
			},
		},
		{
			name: "Fallback to basic plan if license status is inactive",
			data: []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"INACTIVE","plan":{"name":"TEAMS"},"valid_from": 1730899309,"valid_until": -1}`),
			pass: true,
			expected: &LicenseV3{
				ID:  "does-not-matter",
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "TEAMS",
					},
					"category":    "FREE",
					"status":      "INACTIVE",
					"valid_from":  float64(1730899309),
					"valid_until": float64(-1),
				},
				Plan: Plan{
					Name: PlanNameBasic,
				},
				ValidFrom:  1730899309,
				ValidUntil: -1,
				Status:     "INACTIVE",
				Category:   "FREE",
				IsCurrent:  false,
				Features:   model.FeatureSet{},
			},
		},
		{
			name: "fallback states for validFrom and validUntil",
			data: []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{"name":"TEAMS"},"valid_from":1234.456,"valid_until":5678.567}`),
			pass: true,
			expected: &LicenseV3{
				ID:  "does-not-matter",
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "TEAMS",
					},
					"valid_from":  1234.456,
					"valid_until": 5678.567,
					"category":    "FREE",
					"status":      "ACTIVE",
				},
				Plan: Plan{
					Name: PlanNameTeams,
				},
				ValidFrom:  0,
				ValidUntil: -1,
				Status:     "ACTIVE",
				Category:   "FREE",
				IsCurrent:  false,
				Features:   model.FeatureSet{},
			},
		},
	}

	for _, tc := range testCases {
		var licensePayload map[string]interface{}
		err := json.Unmarshal(tc.data, &licensePayload)
		require.NoError(t, err)
		license, err := NewLicenseV3(licensePayload)
		if license != nil {
			license.Features = make(model.FeatureSet, 0)
			delete(license.Data, "features")
		}

		if tc.pass {
			require.NoError(t, err)
			require.NotNil(t, license)
			assert.Equal(t, tc.expected, license)
		} else {
			require.Error(t, err)
			assert.EqualError(t, err, tc.error.Error())
			require.Nil(t, license)
		}

	}
}

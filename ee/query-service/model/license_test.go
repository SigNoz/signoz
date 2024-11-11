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
			name:  "give plan error when plan not present",
			data:  []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":"{}"}`),
			pass:  false,
			error: errors.New("plan is not a valid map[string]interface{} struct"),
		},
		{
			name: "parse the plan properly!",
			data: []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{"name":"TEAMS"}}`),
			pass: true,
			expected: &LicenseV3{
				ID:  "does-not-matter",
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "TEAMS",
					},
					"category": "FREE",
					"status":   "ACTIVE",
				},
				Plan: Plan{
					Name: PlanNameTeams,
				},
				ValidFrom:  0,
				ValidUntil: 0,
				Status:     "ACTIVE",
				Category:   "FREE",
				IsCurrent:  false,
				Features:   model.FeatureSet{},
			},
		},
		{
			name: "parse the validFrom and validUntil",
			data: []byte(`{"id":"does-not-matter","key":"does-not-matter-key","category":"FREE","status":"ACTIVE","plan":{"name":"TEAMS"},"valid_from":1234,"valid_until":5678}`),
			pass: true,
			expected: &LicenseV3{
				ID:  "does-not-matter",
				Key: "does-not-matter-key",
				Data: map[string]interface{}{
					"plan": map[string]interface{}{
						"name": "TEAMS",
					},
					"valid_from":  float64(1234),
					"valid_until": float64(5678),
					"category":    "FREE",
					"status":      "ACTIVE",
				},
				Plan: Plan{
					Name: PlanNameTeams,
				},
				ValidFrom:  1234,
				ValidUntil: 5678,
				Status:     "ACTIVE",
				Category:   "FREE",
				IsCurrent:  false,
				Features:   model.FeatureSet{},
			},
		},
		{
			name:  "Error for missing license id",
			data:  []byte(`{}`),
			pass:  false,
			error: errors.New("license id is missing"),
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
	}

	for _, tc := range testCases {
		var licensePayload map[string]interface{}
		err := json.Unmarshal(tc.data, &licensePayload)
		require.NoError(t, err)
		license, err := NewLicenseV3(licensePayload)
		if license != nil {
			license.Features = make(model.FeatureSet, 0)
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

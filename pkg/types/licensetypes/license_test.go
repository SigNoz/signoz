package licensetypes

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewLicenseValidation(t *testing.T) {
	organizationID := valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e")

	testCases := []struct {
		name          string
		data          string
		errorContains string
	}{
		{
			name:          "missing license id",
			data:          `{}`,
			errorContains: "license id is missing",
		},
		{
			name:          "missing license key",
			data:          `{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e"}`,
			errorContains: "license key is missing",
		},
		{
			name:          "missing license status",
			data:          `{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter"}`,
			errorContains: "license status is missing",
		},
		{
			name:          "missing license plan name",
			data:          `{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter","status":"ACTIVE","plan":{}}`,
			errorContains: "license plan name is missing",
		},
	}

	for _, tc := range testCases {
		zeusLicense := new(zeustypes.License)
		require.NoError(t, json.Unmarshal([]byte(tc.data), zeusLicense), tc.name)

		license, err := NewLicense(zeusLicense, organizationID)
		require.Error(t, err, tc.name)
		assert.ErrorContains(t, err, tc.errorContains, tc.name)
		require.Nil(t, license, tc.name)
	}
}

func TestNewLicense(t *testing.T) {
	organizationID := valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e")

	zeusLicense := new(zeustypes.License)
	require.NoError(t, json.Unmarshal([]byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","status":"ACTIVE","state":"EVALUATING","platform":"SELF_HOSTED","plan":{"name":"ENTERPRISE"},"valid_from":1730899309,"valid_until":-1,"free_until":"2025-05-16T11:17:48.124202Z","features":[{"name":"sso","active":true,"usage":0,"usage_limit":-1,"route":""}],"event_queue":{"event":"DEFAULT","status":"SCHEDULED"}}`), zeusLicense))

	license, err := NewLicense(zeusLicense, organizationID)
	require.NoError(t, err)

	assert.Equal(t, valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e"), license.ID)
	assert.Equal(t, "does-not-matter-key", license.Key)
	assert.Equal(t, PlanNameEnterprise, license.Plan.Name)
	assert.Equal(t, valuer.NewString("active"), license.Status)
	assert.Equal(t, valuer.NewString("evaluating"), license.State)
	assert.Equal(t, LicensePlatformSelfHosted, license.Platform)
	assert.Equal(t, valuer.NewString("default"), license.EventQueue.Event)
	assert.Equal(t, valuer.NewString("scheduled"), license.EventQueue.Status)
	assert.Equal(t, int64(1730899309), license.ValidFrom)
	assert.Equal(t, int64(-1), license.ValidUntil)
	assert.Equal(t, time.Date(2025, 5, 16, 11, 17, 48, 124202000, time.UTC), license.FreeUntil)
	assert.Equal(t, organizationID, license.OrganizationID)

	ssoFeature := false
	for _, feature := range license.Features {
		if feature.Name == SSO {
			ssoFeature = feature.Active
		}
	}
	assert.True(t, ssoFeature)

	assert.NotContains(t, license.Data, "id")
	assert.NotContains(t, license.Data, "key")
	assert.Equal(t, "ACTIVE", license.Data["status"])

	gettableLicense := NewGettableLicense(license)
	assert.Equal(t, license.ID, gettableLicense.ID)
	assert.Equal(t, valuer.NewString("active"), gettableLicense.Status)
	assert.Equal(t, LicensePlatformSelfHosted, gettableLicense.Platform)
	assert.Equal(t, PlanNameEnterprise, gettableLicense.Plan.Name)

	gettableLicenseWithKey := NewGettableLicenseWithKey(license)
	assert.Equal(t, "does-not-matter-key", gettableLicenseWithKey.Key)
}

func TestNewLicenseFallsBackToBasicPlanOnInvalidStatus(t *testing.T) {
	organizationID := valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e")

	zeusLicense := new(zeustypes.License)
	require.NoError(t, json.Unmarshal([]byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","status":"INVALID","plan":{"name":"ENTERPRISE"},"valid_from":1730899309,"valid_until":-1}`), zeusLicense))

	license, err := NewLicense(zeusLicense, organizationID)
	require.NoError(t, err)

	assert.Equal(t, PlanNameBasic, license.Plan.Name)
}

func TestNewLicenseFromStorableLicenseRoundTrip(t *testing.T) {
	organizationID := valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e")

	zeusLicense := new(zeustypes.License)
	require.NoError(t, json.Unmarshal([]byte(`{"id":"0196f794-ff30-7bee-a5f4-ef5ad315715e","key":"does-not-matter-key","status":"ACTIVE","state":"EVALUATING","platform":"CLOUD","plan":{"name":"ENTERPRISE"},"valid_from":1730899309,"valid_until":-1}`), zeusLicense))

	license, err := NewLicense(zeusLicense, organizationID)
	require.NoError(t, err)

	storableLicense := NewStorableLicenseFromLicense(license)

	roundTrippedLicense, err := NewLicenseFromStorableLicense(storableLicense)
	require.NoError(t, err)

	assert.Equal(t, license.ID, roundTrippedLicense.ID)
	assert.Equal(t, license.Key, roundTrippedLicense.Key)
	assert.Equal(t, license.Plan.Name, roundTrippedLicense.Plan.Name)
	assert.Equal(t, license.Status, roundTrippedLicense.Status)
	assert.Equal(t, license.State, roundTrippedLicense.State)
	assert.Equal(t, LicensePlatformCloud, roundTrippedLicense.Platform)
	assert.Equal(t, license.ValidFrom, roundTrippedLicense.ValidFrom)
	assert.Equal(t, license.ValidUntil, roundTrippedLicense.ValidUntil)

	assert.ErrorContains(t, roundTrippedLicense.ErrIfCloud(), "not supported for licenses managed by SigNoz Cloud")
}

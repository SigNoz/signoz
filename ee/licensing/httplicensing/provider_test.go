package httplicensing

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/analytics/analyticstest"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
	"github.com/SigNoz/signoz/pkg/zeus/noopzeus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	testOrganizationID = valuer.MustNewUUID("0196f794-ff30-7bee-a5f4-ef5ad315715e")
	testLicenseID      = valuer.MustNewUUID("0196360e-90cd-7a74-8313-1aa815ce2a67")
	licenseColumns     = []string{"id", "created_at", "updated_at", "key", "data", "last_validated_at", "org_id"}
)

const (
	selectLicensesQuery = `SELECT (.+) FROM "license"`
	updateLicenseQuery  = `UPDATE "license"`
	deleteLicenseQuery  = `DELETE FROM "license"`
	testLicenseData     = `{"status":"VALID","state":"EVALUATING","platform":"SELF_HOSTED","plan":{"name":"ENTERPRISE"},"valid_from":1732146923,"valid_until":-1,"features":[],"event_queue":{}}`
)

func newTestLicensing(t *testing.T) (licensing.Licensing, sqlmock.Sqlmock, cache.Cache) {
	t.Helper()

	sqlStore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)

	licenseCache, err := cachetest.New(cache.Config{Provider: "memory", Memory: cache.Memory{NumCounters: 1000, MaxCost: 1 << 20}})
	require.NoError(t, err)

	providerSettings := instrumentationtest.New().ToProviderSettings()

	noopZeus, err := noopzeus.New(context.Background(), providerSettings, zeus.Config{})
	require.NoError(t, err)

	licensing, err := New(context.Background(), providerSettings, licensing.Config{PollInterval: time.Hour, FailureThreshold: 3}, sqlStore, noopZeus, nil, analyticstest.New(), licenseCache)
	require.NoError(t, err)

	return licensing, sqlStore.Mock(), licenseCache
}

func newLicenseRows(lastValidatedAt time.Time) *sqlmock.Rows {
	createdAt := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return sqlmock.
		NewRows(licenseColumns).
		AddRow(testLicenseID.StringValue(), createdAt, createdAt, "test-license-key", testLicenseData, lastValidatedAt, testOrganizationID.StringValue())
}

func TestGetActiveServesRepeatReadsFromCache(t *testing.T) {
	ctx := context.Background()
	licensing, mock, _ := newTestLicensing(t)

	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(newLicenseRows(time.Now().UTC()))

	fromStore, err := licensing.GetActive(ctx, testOrganizationID)
	require.NoError(t, err)

	fromCache, err := licensing.GetActive(ctx, testOrganizationID)
	require.NoError(t, err)

	assert.Equal(t, licensetypes.NewGettableLicenseWithKey(fromStore), licensetypes.NewGettableLicenseWithKey(fromCache))
	assert.Equal(t, fromStore.OrganizationID, fromCache.OrganizationID)
	assert.True(t, fromStore.LastValidatedAt.Equal(fromCache.LastValidatedAt))

	fromStoreData, err := json.Marshal(fromStore.Data)
	require.NoError(t, err)
	fromCacheData, err := json.Marshal(fromCache.Data)
	require.NoError(t, err)
	assert.JSONEq(t, string(fromStoreData), string(fromCacheData))

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetActiveCachesNoActiveLicense(t *testing.T) {
	ctx := context.Background()
	licensing, mock, _ := newTestLicensing(t)

	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(sqlmock.NewRows(licenseColumns))

	for range 2 {
		license, err := licensing.GetActive(ctx, testOrganizationID)
		require.Error(t, err)
		assert.True(t, errors.Ast(err, errors.TypeNotFound))
		assert.Nil(t, license)
	}

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetActiveDoesNotCacheErrors(t *testing.T) {
	ctx := context.Background()
	licensing, mock, _ := newTestLicensing(t)

	createdAt := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	licenseRowWithoutStatus := sqlmock.
		NewRows(licenseColumns).
		AddRow(testLicenseID.StringValue(), createdAt, createdAt, "test-license-key", `{"plan":{"name":"ENTERPRISE"}}`, createdAt, testOrganizationID.StringValue())

	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(licenseRowWithoutStatus)
	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(newLicenseRows(time.Now().UTC()))

	_, err := licensing.GetActive(ctx, testOrganizationID)
	require.Error(t, err)
	assert.ErrorContains(t, err, "license status is missing")

	license, err := licensing.GetActive(ctx, testOrganizationID)
	require.NoError(t, err)
	assert.Equal(t, testLicenseID, license.ID)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetActiveReloadsExpiredCachedLicense(t *testing.T) {
	ctx := context.Background()
	licensing, mock, licenseCache := newTestLicensing(t)

	expiredLicense := &licensetypes.License{
		ID:             valuer.GenerateUUID(),
		ValidFrom:      time.Now().Add(-2 * time.Hour).Unix(),
		ValidUntil:     time.Now().Add(-time.Hour).Unix(),
		OrganizationID: testOrganizationID,
	}
	require.NoError(t, licenseCache.Set(ctx, testOrganizationID, activeLicenseCacheKey, &cachedActiveLicense{License: expiredLicense}, activeLicenseCacheTTL))

	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(newLicenseRows(time.Now().UTC()))

	license, err := licensing.GetActive(ctx, testOrganizationID)
	require.NoError(t, err)
	assert.Equal(t, testLicenseID, license.ID)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestDeleteClearsCachedActiveLicense(t *testing.T) {
	ctx := context.Background()
	licensing, mock, _ := newTestLicensing(t)

	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(newLicenseRows(time.Now().UTC()))
	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(newLicenseRows(time.Now().UTC()))
	mock.ExpectExec(deleteLicenseQuery).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(sqlmock.NewRows(licenseColumns))

	_, err := licensing.GetActive(ctx, testOrganizationID)
	require.NoError(t, err)

	require.NoError(t, licensing.Delete(ctx, testOrganizationID, testLicenseID))

	_, err = licensing.GetActive(ctx, testOrganizationID)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound))

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRefreshClearsCachedActiveLicenseOnDowngrade(t *testing.T) {
	ctx := context.Background()
	licensing, mock, _ := newTestLicensing(t)

	staleLastValidatedAt := time.Now().Add(-4 * time.Hour).UTC()
	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(newLicenseRows(staleLastValidatedAt))
	mock.ExpectExec(updateLicenseQuery).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(selectLicensesQuery).WillReturnRows(newLicenseRows(staleLastValidatedAt))

	_, err := licensing.GetActive(ctx, testOrganizationID)
	require.NoError(t, err)

	require.NoError(t, licensing.Refresh(ctx, testOrganizationID))

	_, err = licensing.GetActive(ctx, testOrganizationID)
	require.NoError(t, err)

	require.NoError(t, mock.ExpectationsWereMet())
}

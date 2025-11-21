package signoz

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfmanagertest"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlschema/sqlschematest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/tokenizer/tokenizertest"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/stretchr/testify/assert"
)

// This is a test to ensure that provider factories can be created without panicking since
// we are using the factory.MustNewNamedMap function to initialize the provider factories.
// It also helps us catch these errors during testing instead of runtime.
func TestNewProviderFactories(t *testing.T) {
	assert.NotPanics(t, func() {
		NewCacheProviderFactories()
	})

	assert.NotPanics(t, func() {
		NewWebProviderFactories()
	})

	assert.NotPanics(t, func() {
		NewSQLStoreProviderFactories()
	})

	assert.NotPanics(t, func() {
		NewTelemetryStoreProviderFactories()
	})

	assert.NotPanics(t, func() {
		NewSQLMigrationProviderFactories(
			sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual),
			sqlschematest.New(map[string]*sqlschema.Table{}, map[string][]*sqlschema.UniqueConstraint{}, map[string]sqlschema.Index{}),
			telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherEqual),
			instrumentationtest.New().ToProviderSettings(),
		)
	})

	assert.NotPanics(t, func() {
		NewPrometheusProviderFactories(telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherEqual))
	})

	assert.NotPanics(t, func() {
		orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)), nil)
		notificationManager := nfmanagertest.NewMock()
		NewAlertmanagerProviderFactories(sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual), orgGetter, notificationManager)
	})

	assert.NotPanics(t, func() {
		NewRulerProviderFactories(sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual))
	})

	assert.NotPanics(t, func() {
		NewEmailingProviderFactories()
	})

	assert.NotPanics(t, func() {
		NewSharderProviderFactories()
	})

	assert.NotPanics(t, func() {
		userGetter := impluser.NewGetter(impluser.NewStore(sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual), instrumentationtest.New().ToProviderSettings()))
		orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherEqual)), nil)
		telemetryStore := telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherEqual)
		NewStatsReporterProviderFactories(telemetryStore, []statsreporter.StatsCollector{}, orgGetter, userGetter, tokenizertest.New(), version.Build{}, analytics.Config{Enabled: true})
	})
}

package clickhousetelemetrystore

import (
	"context"
	"testing"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystorehooktest"
)

func TestCastError_ProfileErrors(t *testing.T) {
	testCases := []struct {
		name     string
		code     chproto.Error
		want     errors.Code
		notFound bool
	}{
		{name: "SettingConstraintViolation_SettingNotAllowed", code: chproto.ErrSettingConstraintViolation, want: ErrCodeSettingNotAllowed},
		{name: "TooManyRowsOrBytes_ResultTooLarge", code: chproto.ErrTooManyRowsOrBytes, want: ErrCodeResultTooLarge},
		{name: "TooManyRows_ReadTooLarge", code: chproto.ErrTooManyRows, want: ErrCodeReadTooLarge},
		{name: "TooManyBytes_ReadTooLarge", code: chproto.ErrTooManyBytes, want: ErrCodeReadTooLarge},
		{name: "TooManyPartitions_ReadTooLarge", code: chproto.ErrTooManyPartitions, want: ErrCodeReadTooLarge},
		{name: "Readonly_ReadonlyMode", code: chproto.ErrReadonly, want: ErrCodeReadonlyMode},
		{name: "ThereIsNoProfile_SettingsProfileNotFound", code: chproto.ErrThereIsNoProfile, want: ErrCodeSettingsProfileNotFound, notFound: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := castError(&clickhouse.Exception{Code: int32(testCase.code), Message: testCase.name})

			require.Error(t, err)
			assert.True(t, errors.Asc(err, testCase.want), "got %v", err)
			assert.Equal(t, testCase.notFound, errors.Ast(err, errors.TypeNotFound), "got %v", err)
			assert.Equal(t, !testCase.notFound, errors.Ast(err, errors.TypeInvalidInput), "got %v", err)
		})
	}
}

func TestProviderBeforeQuery(t *testing.T) {
	testCases := []struct {
		name    string
		profile string
		want    clickhouse.Settings
	}{
		{name: "NoProfile_HookSettings", profile: "", want: clickhouse.Settings{"max_threads": 2, "profile": "set_by_hook"}},
		{name: "Profile_SetAfterHooks", profile: "clickhouse_query", want: clickhouse.Settings{"max_threads": 2, "profile": clickhouse.CustomSetting{Value: "clickhouse_query"}}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			hook := telemetrystorehooktest.NewMockTelemetryStoreHook(t)
			hook.EXPECT().BeforeQuery(mock.Anything, mock.Anything).RunAndReturn(func(ctx context.Context, event *telemetrystore.QueryEvent) context.Context {
				event.Settings["max_threads"] = 2
				event.Settings["profile"] = "set_by_hook"
				return ctx
			})
			p := &provider{profile: testCase.profile, hooks: []telemetrystore.TelemetryStoreHook{hook}}
			event := telemetrystore.NewQueryEvent("SELECT 1", nil)

			p.beforeQuery(context.Background(), event)

			assert.Equal(t, testCase.want, event.Settings)
		})
	}
}

func TestProviderWithProfile(t *testing.T) {
	conn, err := cmock.NewClickHouseWithQueryMatcher(&clickhouse.Options{}, sqlmock.QueryMatcherEqual)
	require.NoError(t, err)
	conn.ExpectClose()

	p := &provider{clickHouseConn: conn, cluster: "cluster"}
	p.withProfiles([]string{"clickhouse_query"})

	profiled, ok := p.WithProfile("clickhouse_query").(*provider)
	require.True(t, ok)
	assert.NotSame(t, p, profiled)
	assert.Equal(t, "clickhouse_query", profiled.profile)
	assert.Same(t, p.clickHouseConn, profiled.clickHouseConn)
	assert.Equal(t, "cluster", profiled.Cluster())
	assert.Empty(t, p.profile)

	assert.Same(t, p, p.WithProfile("query_range"))
	assert.Same(t, profiled, profiled.WithProfile("clickhouse_query"))

	require.NoError(t, profiled.Close())
	require.NoError(t, p.Close())
	assert.NoError(t, conn.ExpectationsWereMet())
}

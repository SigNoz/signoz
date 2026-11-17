package clickhousetelemetrystore

import (
	"context"
	"testing"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystorehook"
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

func TestProviderWithProfile(t *testing.T) {
	conn, err := cmock.NewClickHouseWithQueryMatcher(&clickhouse.Options{}, sqlmock.QueryMatcherEqual)
	require.NoError(t, err)
	conn.ExpectClose()

	settingsHook, err := telemetrystorehook.NewSettings(context.Background(), factorytest.NewSettings(), telemetrystore.Config{})
	require.NoError(t, err)
	otherHook := telemetrystorehooktest.NewMockTelemetryStoreHook(t)

	p := &provider{clickHouseConn: conn, cluster: "cluster", hooks: []telemetrystore.TelemetryStoreHook{settingsHook, otherHook}}
	p.withProfiles([]string{"clickhouse_query"})

	profiled, ok := p.WithProfile("clickhouse_query").(*provider)
	require.True(t, ok)
	assert.NotSame(t, p, profiled)
	assert.Equal(t, "clickhouse_query", profiled.profile)
	assert.Same(t, p.clickHouseConn, profiled.clickHouseConn)
	assert.Equal(t, "cluster", profiled.Cluster())
	assert.Empty(t, p.profile)
	require.Len(t, profiled.hooks, 2)
	assert.Equal(t, settingsHook.(telemetrystore.TelemetryStoreProfileHook).WithProfile("clickhouse_query"), profiled.hooks[0])
	assert.Same(t, otherHook, profiled.hooks[1])
	assert.Same(t, settingsHook, p.hooks[0])

	assert.Same(t, p, p.WithProfile("query_range"))
	assert.Same(t, profiled, profiled.WithProfile("clickhouse_query"))

	require.NoError(t, profiled.Close())
	require.NoError(t, p.Close())
	assert.NoError(t, conn.ExpectationsWereMet())
}

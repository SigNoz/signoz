package clickhousetelemetrystore

import (
	"testing"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

func TestCastError_SettingConstraintViolation(t *testing.T) {
	err := castError(&clickhouse.Exception{Code: int32(chproto.ErrSettingConstraintViolation), Message: "Setting max_result_bytes shouldn't be greater than 500000"})

	require.Error(t, err)
	assert.True(t, errors.Asc(err, ErrCodeSettingNotAllowed), "got %v", err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "got %v", err)
}

type fakeConn struct {
	clickhouse.Conn
}

func TestProviderWithProfile(t *testing.T) {
	mainConn, defaultConn, queryRangeConn := &fakeConn{}, &fakeConn{}, &fakeConn{}
	settings := factory.NewScopedProviderSettings(factorytest.NewSettings(), "test")

	testCases := []struct {
		name         string
		profileConns map[string]clickhouse.Conn
		profile      string
		wantStore    clickhouse.Conn
		wantProfile  clickhouse.Conn
	}{
		{name: "NoProfiles_MainConn", profileConns: map[string]clickhouse.Conn{}, profile: "query_range", wantStore: mainConn, wantProfile: mainConn},
		{name: "Configured_ProfileConn", profileConns: map[string]clickhouse.Conn{"query_range": queryRangeConn}, profile: "query_range", wantStore: mainConn, wantProfile: queryRangeConn},
		{name: "DefaultConfigured_DefaultConn", profileConns: map[string]clickhouse.Conn{telemetrystore.ProfileDefault: defaultConn}, profile: telemetrystore.ProfileDefault, wantStore: defaultConn, wantProfile: defaultConn},
		{name: "Unconfigured_DefaultConfigured_DefaultConn", profileConns: map[string]clickhouse.Conn{telemetrystore.ProfileDefault: defaultConn}, profile: "query_range", wantStore: defaultConn, wantProfile: defaultConn},
		{name: "Main_DefaultConfigured_MainConn", profileConns: map[string]clickhouse.Conn{telemetrystore.ProfileDefault: defaultConn}, profile: telemetrystore.ProfileMain, wantStore: defaultConn, wantProfile: mainConn},
		{name: "Main_NoProfiles_MainConn", profileConns: map[string]clickhouse.Conn{}, profile: telemetrystore.ProfileMain, wantStore: mainConn, wantProfile: mainConn},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			p := newProvider(settings, mainConn, testCase.profileConns, "cluster", nil)

			assert.Same(t, testCase.wantStore, p.clickHouseConn)
			assert.Same(t, testCase.wantProfile, p.WithProfile(testCase.profile).(*provider).clickHouseConn)
		})
	}
}

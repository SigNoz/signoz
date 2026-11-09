package clickhousetelemetrystore

import (
	"context"
	"testing"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
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

func TestProviderConnFor(t *testing.T) {
	defaultConn, profileConn := &fakeConn{}, &fakeConn{}
	p := &provider{clickHouseConn: defaultConn, profileConns: map[string]clickhouse.Conn{"query_range": profileConn}}

	testCases := []struct {
		name string
		ctx  context.Context
		want clickhouse.Conn
	}{
		{name: "NoProfile_DefaultConn", ctx: context.Background(), want: defaultConn},
		{name: "Profile_ProfileConn", ctx: telemetrystore.NewContextWithProfile(context.Background(), "query_range"), want: profileConn},
		{name: "UnknownProfile_DefaultConn", ctx: telemetrystore.NewContextWithProfile(context.Background(), "unknown"), want: defaultConn},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Same(t, testCase.want, p.connFor(testCase.ctx))
		})
	}
}

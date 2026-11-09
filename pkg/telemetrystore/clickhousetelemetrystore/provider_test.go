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
	nativeConn, httpConn := &fakeConn{}, &fakeConn{}
	profileCtx := telemetrystore.NewContextWithProfile(context.Background(), "query_range")

	testCases := []struct {
		name     string
		provider *provider
		ctx      context.Context
		want     clickhouse.Conn
		wantCode errors.Code
	}{
		{name: "NoProfile_Native", provider: &provider{clickHouseConn: nativeConn, httpConn: httpConn}, ctx: context.Background(), want: nativeConn},
		{name: "Profile_HTTP", provider: &provider{clickHouseConn: nativeConn, httpConn: httpConn}, ctx: profileCtx, want: httpConn},
		{name: "ProfileWithoutHTTPDSN_Error", provider: &provider{clickHouseConn: nativeConn}, ctx: profileCtx, wantCode: ErrCodeProfileUnavailable},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			conn, err := testCase.provider.connFor(testCase.ctx)
			if testCase.wantCode != (errors.Code{}) {
				require.Error(t, err)
				assert.True(t, errors.Asc(err, testCase.wantCode), "got %v", err)
				return
			}
			require.NoError(t, err)
			assert.Same(t, testCase.want, conn)
		})
	}
}

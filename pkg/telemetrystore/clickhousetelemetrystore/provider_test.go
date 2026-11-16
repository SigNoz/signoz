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
	defaultConn, profileConn := &fakeConn{}, &fakeConn{}
	p := &provider{settings: factory.NewScopedProviderSettings(factorytest.NewSettings(), "test"), clickHouseConn: defaultConn, profileConns: map[string]clickhouse.Conn{"query_range": profileConn}}

	assert.Same(t, profileConn, p.WithProfile("query_range").(*provider).clickHouseConn)
	assert.Same(t, defaultConn, p.clickHouseConn)
	assert.Same(t, p, p.WithProfile(telemetrystore.ProfileDefault))
	assert.Same(t, p, p.WithProfile("unknown"))
}

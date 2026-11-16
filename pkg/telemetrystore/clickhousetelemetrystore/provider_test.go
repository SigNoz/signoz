package clickhousetelemetrystore

import (
	"testing"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestCastError_SettingConstraintViolation(t *testing.T) {
	err := castError(&clickhouse.Exception{Code: int32(chproto.ErrSettingConstraintViolation), Message: "Setting max_result_bytes shouldn't be greater than 500000"})

	require.Error(t, err)
	assert.True(t, errors.Asc(err, ErrCodeSettingNotAllowed), "got %v", err)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "got %v", err)
}

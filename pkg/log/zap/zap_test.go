package zap

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"
)

func TestInfoctx(t *testing.T) {
	ctx := context.Background()
	core, logs := observer.New(zapcore.InfoLevel) // zap has a special zaptest/observer module made for unit testing
	logger := NewLogger("info")
	logger.(*zapLogger).l = zap.New(core).Sugar()
	logger.Infoctx(ctx, "this is a test for the info with context logger", "url", true)
	assert.Equal(t, 1, logs.Len())
	assert.Equal(t, "this is a test for the info with context logger", logs.All()[0].Message)
	assert.Equal(t, zapcore.InfoLevel, logs.All()[0].Level)
	assert.Equal(t, []zapcore.Field{zap.Bool("url", true)}, logs.All()[0].Context)
}

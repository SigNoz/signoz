package log

import (
	"context"

	"go.uber.org/zap"
)

type Logger interface {
	With(...interface{}) Logger
	Debugctx(context.Context, string, ...interface{}) //Read as Debug with ctx
	Infoctx(context.Context, string, ...interface{})
	Warnctx(context.Context, string, ...interface{})
	Errorctx(context.Context, string, ...interface{})
	Panicctx(context.Context, string, ...interface{})
	Fatalctx(context.Context, string, ...interface{})
	Debug(string, ...interface{})
	Info(string, ...interface{})
	Warn(string, ...interface{})
	Error(string, ...interface{})
	Panic(string, ...interface{})
	Fatal(string, ...interface{})
	Flush() error
	Getl() *zap.Logger
}

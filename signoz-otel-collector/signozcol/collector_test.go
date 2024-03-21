package signozcol

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func TestCollectorNew(t *testing.T) {
	coll := New(WrappedCollectorSettings{
		ConfigPaths: []string{"testdata/config.yaml"},
		Version:     "0.0.1-test-new",
		Desc:        "test",
		LoggingOpts: []zap.Option{zap.AddStacktrace(zapcore.ErrorLevel)},
	})
	if coll == nil {
		t.Fatal("coll is nil")
	}
}

func TestCollectorRunInvalidPath(t *testing.T) {
	coll := New(WrappedCollectorSettings{
		ConfigPaths: []string{"testdata/invalid.yaml"},
		Version:     "0.0.1-test-invalid-path",
		Desc:        "test",
		LoggingOpts: []zap.Option{zap.AddStacktrace(zapcore.ErrorLevel)},
	})
	if coll == nil {
		t.Fatal("coll is nil")
	}

	err := coll.Run(context.TODO())
	defer coll.Shutdown()
	if err == nil {
		t.Fatal("expected error")
	}
	assert.Contains(t, err.Error(), "no such file or directory")
}

func TestCollectorRunValidPath(t *testing.T) {
	coll := New(WrappedCollectorSettings{
		ConfigPaths: []string{"testdata/config.yaml"},
		Version:     "0.0.1-test-valid-path",
		Desc:        "test",
		LoggingOpts: []zap.Option{zap.AddStacktrace(zapcore.ErrorLevel)},
	})
	if coll == nil {
		t.Fatal("coll is nil")
	}

	err := coll.Run(context.TODO())
	defer coll.Shutdown()

	if err != nil {
		t.Fatal(err)
	}
}

func TestCollectorRunValidPathInvalidConfig(t *testing.T) {
	coll := New(WrappedCollectorSettings{
		ConfigPaths: []string{"testdata/invalid_config.yaml"},
		Version:     "0.0.1-test-valid-path-invalid-config",
		Desc:        "test",
		LoggingOpts: []zap.Option{zap.AddStacktrace(zapcore.ErrorLevel)},
	})
	if coll == nil {
		t.Fatal("coll is nil")
	}

	err := coll.Run(context.TODO())
	defer coll.Shutdown()

	if err == nil {
		t.Fatal("expected error")
	}
	assert.Contains(t, err.Error(), "invalid configuration")
}

func TestCollectorShutdown(t *testing.T) {
	coll := New(WrappedCollectorSettings{
		ConfigPaths: []string{"testdata/config.yaml"},
		Version:     "0.0.1-test-shutdown",
		Desc:        "test",
		LoggingOpts: []zap.Option{zap.AddStacktrace(zapcore.ErrorLevel)},
	})
	if coll == nil {
		t.Fatal("coll is nil")
	}

	err := coll.Run(context.TODO())

	if err != nil {
		t.Fatal(err)
	}

	coll.Shutdown()
	shutdownErr := <-coll.ErrorChan()
	if shutdownErr != nil {
		t.Fatal(shutdownErr)
	}
}

func TestCollectorRunMultipleTimes(t *testing.T) {
	coll := New(WrappedCollectorSettings{
		ConfigPaths: []string{"testdata/config.yaml"},
		Version:     "0.0.1-test-run-multiple-times",
		Desc:        "test",
		LoggingOpts: []zap.Option{zap.AddStacktrace(zapcore.ErrorLevel)},
	})
	if coll == nil {
		t.Fatal("coll is nil")
	}

	err := coll.Run(context.TODO())
	defer coll.Shutdown()

	if err != nil {
		t.Fatal(err)
	}

	err = coll.Run(context.TODO())
	if err == nil {
		t.Fatal("expected error")
	}
	assert.Contains(t, err.Error(), "already running")
}

func TestCollectorRestart(t *testing.T) {
	coll := New(WrappedCollectorSettings{
		ConfigPaths: []string{"testdata/config.yaml"},
		Version:     "0.0.1-test-restart",
		Desc:        "test",
		LoggingOpts: []zap.Option{zap.AddStacktrace(zapcore.ErrorLevel)},
	})
	if coll == nil {
		t.Fatal("coll is nil")
	}

	err := coll.Run(context.TODO())
	defer coll.Shutdown()

	if err != nil {
		t.Fatal(err)
	}

	err = coll.Restart(context.TODO())
	if err != nil {
		t.Fatal(err)
	}
}

package sqlstore

import "log/slog"

type bunLogger struct {
	logger *slog.Logger
}

func (l *bunLogger) Printf(format string, v ...interface{}) {
	// the no lint directive is needed because the bun logger does not accept context
	l.logger.Info(format, v...) //nolint:sloglint
}

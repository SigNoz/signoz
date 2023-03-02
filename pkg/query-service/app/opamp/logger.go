package opamp

import "log"

type Logger struct {
	logger *log.Logger
}

func (l *Logger) Debugf(format string, v ...interface{}) {
	l.logger.Printf(format, v...)
}

func (l *Logger) Errorf(format string, v ...interface{}) {
	l.logger.Printf(format, v...)
}

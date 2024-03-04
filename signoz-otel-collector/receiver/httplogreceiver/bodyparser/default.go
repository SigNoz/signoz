package bodyparser

import (
	"strings"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
)

type Default struct {
}

func (l *Default) Parse(body []byte) (plog.Logs, int, error) {
	// split by newline and return
	// TODO: add configuration for multiline
	ld := plog.NewLogs()
	data := string(body)
	if data == "" {
		return ld, 0, nil
	}
	rl := ld.ResourceLogs().AppendEmpty()
	sl := rl.ScopeLogs().AppendEmpty()
	loglines := strings.Split(data, "\n")
	for _, log := range loglines {
		l := sl.LogRecords().AppendEmpty()
		l.Body().SetStr(log)
		l.SetObservedTimestamp(pcommon.NewTimestampFromTime(time.Now().UTC()))
	}
	return ld, len(loglines), nil
}

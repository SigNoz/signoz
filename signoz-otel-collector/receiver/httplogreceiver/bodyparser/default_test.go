package bodyparser

import (
	"testing"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/pdatatest/plogtest"
	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/plog"
)

func TestDefaultParse(t *testing.T) {
	t.Parallel()
	d := Default{}
	tests := []struct {
		name    string
		PayLoad string
		Logs    func() plog.Logs
		isError bool
	}{
		{
			name:    "Test 1",
			PayLoad: `This is a log line`,
			Logs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				sl.LogRecords().AppendEmpty().Body().SetStr("This is a log line")
				return ld
			},
		},
		{
			name:    "Test 2 - multiple lines",
			PayLoad: "This is a log line\nThis is another log line",
			Logs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				sl.LogRecords().AppendEmpty().Body().SetStr("This is a log line")
				sl.LogRecords().AppendEmpty().Body().SetStr("This is another log line")
				return ld
			},
		},
		{
			name:    "Test 3 - empty",
			PayLoad: "",
			Logs: func() plog.Logs {
				ld := plog.NewLogs()
				return ld
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, _, _ := d.Parse([]byte(tt.PayLoad))
			logs := tt.Logs()
			assert.NoError(t, plogtest.CompareLogs(logs, res, plogtest.IgnoreObservedTimestamp()))
		})
	}
}

package bodyparser

import (
	"testing"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/pdatatest/plogtest"
	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/plog"
)

func TestOctetCountingSplitter(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name             string
		payLoad          string
		expectedLogLines []string
		isError          bool
	}{
		{
			name:    "Test 1",
			payLoad: `9 <1>1 - -`,
			expectedLogLines: []string{
				`<1>1 - -`,
			},
		},
		{
			name:    "Test 2",
			payLoad: `9 <1>1 - -9 <2>2 - -`,
			expectedLogLines: []string{
				`<1>1 - -`,
				`<2>2 - -`,
			},
		},
		{
			name: "Test 3 with newline",
			payLoad: `9 <1>1 - -
11 <2>2 - - s`,
			expectedLogLines: []string{
				`<1>1 - -`,
				`<2>2 - - s`,
			},
		},
		{
			name: "Test 4 with newline and tabs",
			payLoad: `9 <1>1 - -
			9 <2>1 - -
			9 <3>1 - -`,
			expectedLogLines: []string{
				`<1>1 - -`,
				`<2>1 - -`,
				`<3>1 - -`,
			},
		},
		{
			name:    "Test 5",
			payLoad: `250 <190>1 2023-10-13T10:48:11.04591+00:00 host app web.1 - 10.1.23.40 - - [13/Oct/2023:10:48:11 +0000] "GET / HTTP/1.1" 200 7450 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"`,
			expectedLogLines: []string{
				`<190>1 2023-10-13T10:48:11.04591+00:00 host app web.1 - 10.1.23.40 - - [13/Oct/2023:10:48:11 +0000] "GET / HTTP/1.1" 200 7450 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"`},
		},
		{
			name: "Test 6 - extra newline",
			payLoad: `9 <1>1 - -
			`,
			expectedLogLines: []string{
				`<1>1 - -`,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := octetCountingSplitter(tt.payLoad)
			assert.Equal(t, tt.expectedLogLines, res)
		})
	}
}

func AddDefaultResources(rl plog.ResourceLogs) {
	attrs := rl.Resource().Attributes()
	attrs.EnsureCapacity(5)
	attrs.PutStr("priority", "190")
	attrs.PutStr("version", "1")
	attrs.PutStr("hostname", "host")
	attrs.PutStr("appname", "app")
	attrs.PutStr("procid", "otel-collector.1")
}

func TestHerokuParse(t *testing.T) {
	t.Parallel()
	d := NewHerokuBodyParser()
	tests := []struct {
		name         string
		payLoad      string
		expectedLogs func() plog.Logs
		count        int
		isError      bool
	}{
		{
			name:    "Test 1",
			payLoad: `151 <190>1 2023-10-12T07:25:48.393741+00:00 host app otel-collector.1 - 2023-10-12T07:25:48.393Z	info	service/telemetry.go:104	Setting up own telemetry...`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				AddDefaultResources(rl)
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("2023-10-12T07:25:48.393Z	info	service/telemetry.go:104	Setting up own telemetry...")
				log.Attributes().PutStr("timestamp", "2023-10-12T07:25:48.393741+00:00")
				log.Attributes().PutStr("msgid", "-")
				return ld
			},
		},
		{
			name: "Test 2 - multiline",
			payLoad: `151 <190>1 2023-10-12T07:25:48.393741+00:00 host app otel-collector.1 - 2023-10-12T07:25:48.393Z	info	service/telemetry.go:104	Setting up own telemetry...
			189 <190>1 2023-10-12T07:25:48.393855+00:00 host app otel-collector.1 - 2023-10-12T07:25:48.393Z	info	service/telemetry.go:127	Serving Prometheus metrics	{"address": ":8888", "level": "Basic"}`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				AddDefaultResources(rl)
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("2023-10-12T07:25:48.393Z	info	service/telemetry.go:104	Setting up own telemetry...")
				log.Attributes().PutStr("timestamp", "2023-10-12T07:25:48.393741+00:00")
				log.Attributes().PutStr("msgid", "-")
				log1 := sl.LogRecords().AppendEmpty()
				log1.Body().SetStr(`2023-10-12T07:25:48.393Z	info	service/telemetry.go:127	Serving Prometheus metrics	{"address": ":8888", "level": "Basic"}`)
				log1.Attributes().PutStr("timestamp", "2023-10-12T07:25:48.393855+00:00")
				log1.Attributes().PutStr("msgid", "-")
				return ld
			},
		},
		{
			name:    "Test 3 - empty",
			payLoad: ``,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				return ld
			},
		},
		{
			name:    "Test 4 - wrong pattern",
			payLoad: `28 Setting up own telemetry...`,
			expectedLogs: func() plog.Logs {
				ld := plog.NewLogs()
				rl := ld.ResourceLogs().AppendEmpty()
				sl := rl.ScopeLogs().AppendEmpty()
				log := sl.LogRecords().AppendEmpty()
				log.Body().SetStr("Setting up own telemetry...")
				return ld
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, _, _ := d.Parse([]byte(tt.payLoad))
			logs := tt.expectedLogs()
			assert.NoError(t, plogtest.CompareLogs(logs, res, plogtest.IgnoreObservedTimestamp()))
		})
	}
}

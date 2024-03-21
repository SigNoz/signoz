// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package testdata

import (
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"
)

var (
	TestLogTime      = time.Date(2020, 2, 11, 20, 26, 13, 789, time.UTC)
	TestLogTimestamp = pcommon.NewTimestampFromTime(TestLogTime)
)

func GenerateLogsOneEmptyResourceLogs() plog.Logs {
	ld := plog.NewLogs()
	ld.ResourceLogs().AppendEmpty()
	return ld
}

func GenerateLogsNoLogRecords() plog.Logs {
	ld := GenerateLogsOneEmptyResourceLogs()
	initResource1(ld.ResourceLogs().At(0).Resource())
	return ld
}

func GenerateLogsOneEmptyLogRecord() plog.Logs {
	ld := GenerateLogsNoLogRecords()
	rs0 := ld.ResourceLogs().At(0)
	rs0.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()
	return ld
}

func GenerateLogsOneLogRecordNoResource() plog.Logs {
	ld := GenerateLogsOneEmptyResourceLogs()
	rs0 := ld.ResourceLogs().At(0)
	fillLogOne(rs0.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty())
	return ld
}

func GenerateLogsOneLogRecord() plog.Logs {
	ld := GenerateLogsOneEmptyLogRecord()
	fillLogOne(ld.ResourceLogs().At(0).ScopeLogs().At(0).LogRecords().At(0))
	return ld
}

func GenerateLogsTwoLogRecordsSameResource() plog.Logs {
	ld := GenerateLogsOneEmptyLogRecord()
	logs := ld.ResourceLogs().At(0).ScopeLogs().At(0).LogRecords()
	fillLogOne(logs.At(0))
	fillLogTwo(logs.AppendEmpty())
	return ld
}

func fillLogOne(log plog.LogRecord) {
	log.SetTimestamp(TestLogTimestamp)
	log.SetDroppedAttributesCount(1)
	log.SetSeverityNumber(plog.SeverityNumberInfo)
	log.SetSeverityText("Info")
	log.SetSpanID([8]byte{0x01, 0x02, 0x04, 0x08})
	log.SetTraceID([16]byte{0x08, 0x04, 0x02, 0x01})

	attrs := log.Attributes()
	attrs.PutStr("app", "server")
	attrs.PutInt("instance_num", 1)

	log.Body().SetStr("This is a log message")
}

func fillLogTwo(log plog.LogRecord) {
	log.SetTimestamp(TestLogTimestamp)
	log.SetDroppedAttributesCount(1)
	log.SetSeverityNumber(plog.SeverityNumberInfo)
	log.SetSeverityText("Info")

	attrs := log.Attributes()
	attrs.PutStr("customer", "acme")
	attrs.PutStr("env", "dev")

	log.Body().SetStr("something happened")
}

func fillLogThree(log plog.LogRecord) {
	log.SetTimestamp(TestLogTimestamp)
	log.SetDroppedAttributesCount(1)
	log.SetSeverityNumber(plog.SeverityNumberWarn)
	log.SetSeverityText("Warning")

	log.Body().SetStr("something else happened")
}

func GenerateLogsManyLogRecordsSameResource(count int) plog.Logs {
	ld := GenerateLogsOneEmptyLogRecord()
	logs := ld.ResourceLogs().At(0).ScopeLogs().At(0).LogRecords()
	logs.EnsureCapacity(count)
	for i := 0; i < count; i++ {
		var l plog.LogRecord
		if i < logs.Len() {
			l = logs.At(i)
		} else {
			l = logs.AppendEmpty()
		}

		if i%2 == 0 {
			fillLogOne(l)
		} else {
			fillLogTwo(l)
		}
	}
	return ld
}

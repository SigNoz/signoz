// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver // import "github.com/SigNoz/signoz-otel-collector/receiver/signozkafkareceiver"

import (
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/pdata/pmetric"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

type pdataLogsUnmarshaler struct {
	plog.Unmarshaler
	encoding string
}

func (p pdataLogsUnmarshaler) Unmarshal(buf []byte) (plog.Logs, error) {
	return p.Unmarshaler.UnmarshalLogs(buf)
}

func (p pdataLogsUnmarshaler) Encoding() string {
	return p.encoding
}

func newPdataLogsUnmarshaler(unmarshaler plog.Unmarshaler, encoding string) LogsUnmarshaler {
	return pdataLogsUnmarshaler{
		Unmarshaler: unmarshaler,
		encoding:    encoding,
	}
}

type pdataTracesUnmarshaler struct {
	ptrace.Unmarshaler
	encoding string
}

func (p pdataTracesUnmarshaler) Unmarshal(buf []byte) (ptrace.Traces, error) {
	return p.Unmarshaler.UnmarshalTraces(buf)
}

func (p pdataTracesUnmarshaler) Encoding() string {
	return p.encoding
}

func newPdataTracesUnmarshaler(unmarshaler ptrace.Unmarshaler, encoding string) TracesUnmarshaler {
	return pdataTracesUnmarshaler{
		Unmarshaler: unmarshaler,
		encoding:    encoding,
	}
}

type pdataMetricsUnmarshaler struct {
	pmetric.Unmarshaler
	encoding string
}

func (p pdataMetricsUnmarshaler) Unmarshal(buf []byte) (pmetric.Metrics, error) {
	return p.Unmarshaler.UnmarshalMetrics(buf)
}

func (p pdataMetricsUnmarshaler) Encoding() string {
	return p.encoding
}

func newPdataMetricsUnmarshaler(unmarshaler pmetric.Unmarshaler, encoding string) MetricsUnmarshaler {
	return pdataMetricsUnmarshaler{
		Unmarshaler: unmarshaler,
		encoding:    encoding,
	}
}

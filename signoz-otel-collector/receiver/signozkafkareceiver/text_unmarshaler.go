// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

package signozkafkareceiver // import "github.com/SigNoz/signoz-otel-collector/receiver/signozkafkareceiver"
import (
	"errors"
	"time"

	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"

	"github.com/SigNoz/signoz-otel-collector/internal/coreinternal/textutils"
)

type textLogsUnmarshaler struct {
	enc *textutils.Encoding
}

func newTextLogsUnmarshaler() LogsUnmarshalerWithEnc {
	return &textLogsUnmarshaler{}
}

func (r *textLogsUnmarshaler) Unmarshal(buf []byte) (plog.Logs, error) {
	if r.enc == nil {
		return plog.Logs{}, errors.New("encoding not set")
	}
	p := plog.NewLogs()
	decoded, err := r.enc.Decode(buf)
	if err != nil {
		return p, err
	}

	l := p.ResourceLogs().AppendEmpty().ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()
	l.SetObservedTimestamp(pcommon.NewTimestampFromTime(time.Now()))
	l.Body().SetStr(string(decoded))
	return p, nil
}

func (r *textLogsUnmarshaler) Encoding() string {
	return "text"
}

func (r *textLogsUnmarshaler) WithEnc(encodingName string) (LogsUnmarshalerWithEnc, error) {
	var err error
	encCfg := textutils.NewEncodingConfig()
	encCfg.Encoding = encodingName
	enc, err := encCfg.Build()
	if err != nil {
		return nil, err
	}
	return &textLogsUnmarshaler{
		enc: &enc,
	}, nil
}

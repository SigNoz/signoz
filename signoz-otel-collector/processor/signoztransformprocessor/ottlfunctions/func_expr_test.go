package ottlfunctions

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/plog"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottllog"
)

func TestExprFunc(t *testing.T) {
	tests := []struct {
		name     string
		context  ottllog.TransformContext
		expr     string
		expected interface{}
		err      bool
	}{{
		name: "simple expr",
		context: makeTestOttlLogContext(
			"test log body",
			map[string]interface{}{},
			map[string]interface{}{},
			0, "INFO", 1,
		),
		expr:     "50",
		expected: int64(50),
	}, {
		name: "attributes and resources based expr",
		context: makeTestOttlLogContext(
			"test log body",
			map[string]interface{}{"test1": "1"},
			map[string]interface{}{"test2": "2"},
			0, "INFO", 1,
		),
		expr:     "attributes.test1 + resource.test2",
		expected: "12",
	}, {
		name: "body based expr",
		context: makeTestOttlLogContext(
			"test log body",
			map[string]interface{}{},
			map[string]interface{}{},
			0, "INFO", 1,
		),
		expr:     "len(body)",
		expected: int64(len("test log body")),
	}, {
		name: "timestamp based expr",
		context: makeTestOttlLogContext(
			"test log body",
			map[string]interface{}{},
			map[string]interface{}{},
			7200, "INFO", 1,
		),
		expr:     `timestamp - duration("1h")`,
		expected: time.Unix(3600, 0).UTC(),
	}, {
		name: "severity text based expr",
		context: makeTestOttlLogContext(
			"test log body",
			map[string]interface{}{},
			map[string]interface{}{},
			0, "INFO", 1,
		),
		expr:     `"sev: " + severity_text`,
		expected: "sev: INFO",
	}, {
		name: "severity number based expr",
		context: makeTestOttlLogContext(
			"test log body",
			map[string]interface{}{},
			map[string]interface{}{},
			0, "INFO", 9,
		),
		expr:     `"sev: " + string(severity)`,
		expected: "sev: 9",
	}}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ottlExprFunc, err := exprFunc(test.expr)
			assert.NoError(t, err)

			result, err := ottlExprFunc(nil, test.context)
			if test.err {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, test.expected, result)
		})
	}
}

func makeTestOttlLogContext(
	body string,
	attributes map[string]interface{},
	resource map[string]interface{},
	timestampSeconds int64,
	severityText string,
	severity plog.SeverityNumber,
) ottllog.TransformContext {
	ctx := ottllog.NewTransformContext(
		plog.NewLogRecord(),
		pcommon.NewInstrumentationScope(),
		pcommon.NewResource(),
	)
	ctx.GetLogRecord().Body().SetStr(body)
	ctx.GetLogRecord().Attributes().FromRaw(attributes)
	ctx.GetResource().Attributes().FromRaw(resource)
	ctx.GetLogRecord().SetTimestamp(pcommon.NewTimestampFromTime(time.Unix(timestampSeconds, 0)))
	ctx.GetLogRecord().SetSeverityText(severityText)
	ctx.GetLogRecord().SetSeverityNumber(severity)

	return ctx
}

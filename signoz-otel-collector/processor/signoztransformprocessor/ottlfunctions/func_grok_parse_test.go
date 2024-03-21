package ottlfunctions

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/pdata/pcommon"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl"
)

func TestGrokParse(t *testing.T) {
	tests := []struct {
		name     string
		target   ottl.StringGetter[any]
		pattern  string
		expected func(pcommon.Map)
	}{
		{
			name: "common apache log",
			target: &ottl.StandardStringGetter[any]{
				Getter: func(ctx context.Context, tCtx any) (interface{}, error) {
					return `127.0.0.1 - - [23/Apr/2014:22:58:32 +0200] "GET /index.php HTTP/1.1" 404 207`, nil
				},
			},
			pattern: "%{COMMONAPACHELOG}",
			expected: func(expectedMap pcommon.Map) {
				expectedMap.PutStr("clientip", "127.0.0.1")
				expectedMap.PutStr("auth", "-")
				expectedMap.PutStr("timestamp", "23/Apr/2014:22:58:32 +0200")
				expectedMap.PutStr("httpversion", "1.1")
				expectedMap.PutStr("bytes", "207")
				expectedMap.PutStr("ident", "-")
				expectedMap.PutStr("verb", "GET")
				expectedMap.PutStr("request", "/index.php")
				expectedMap.PutStr("rawrequest", "")
				expectedMap.PutStr("response", "404")
			},
		},
		{
			name: "pattern not found",
			target: &ottl.StandardStringGetter[any]{
				Getter: func(ctx context.Context, tCtx any) (interface{}, error) {
					return `Hello world`, nil
				},
			},
			pattern:  `%{TIME}`,
			expected: func(expectedMap pcommon.Map) {},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			grokFunc, err := grokParse(tt.target, tt.pattern)
			assert.NoError(t, err)

			result, err := grokFunc(context.Background(), nil)
			assert.NoError(t, err)

			resultMap, ok := result.(pcommon.Map)
			require.True(t, ok)

			expected := pcommon.NewMap()
			tt.expected(expected)

			assert.Equal(t, expected.Len(), resultMap.Len())
			expected.Range(func(k string, v pcommon.Value) bool {
				ev, _ := expected.Get(k)
				av, _ := resultMap.Get(k)
				assert.Equal(t, ev, av)
				return true
			})
		})
	}
}

func TestGrokParseBadPattern(t *testing.T) {
	grokFunc, err := grokParse[any](&ottl.StandardStringGetter[any]{
		Getter: func(ctx context.Context, tCtx any) (interface{}, error) {
			return "foobar", nil
		}},
		"%{BAD_GROK_PATTERN}",
	)
	assert.Error(t, err)
	assert.Nil(t, grokFunc)
}

func TestGrokParseBadTarget(t *testing.T) {
	tests := []struct {
		name    string
		target  ottl.StringGetter[any]
		pattern string
	}{
		{
			name: "target is non-string",
			target: &ottl.StandardStringGetter[any]{
				Getter: func(ctx context.Context, tCtx any) (interface{}, error) {
					return 123, nil
				},
			},
			pattern: "%{GREEDYDATA}",
		},
		{
			name: "target is nil",
			target: &ottl.StandardStringGetter[any]{
				Getter: func(ctx context.Context, tCtx any) (interface{}, error) {
					return nil, nil
				},
			},
			pattern: "%{GREEDYDATA}",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			grokFunc, err := grokParse[any](tt.target, tt.pattern)
			assert.NoError(t, err)

			result, err := grokFunc(nil, nil)
			assert.Error(t, err)
			assert.Nil(t, result)
		})
	}
}

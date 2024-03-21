// reference from https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/operator/parser/regex/regex.go

package grok

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/operator"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/testutil"
)

var (
	apacheCommonLog = `252.18.112.145 - kshlerin6026 [23/Dec/2022:04:37:05 +0000] "POST /architectures/back-end/relationships/value-added HTTP/2.0" 203 25439`
)

func newTestParser(t *testing.T, pattern string, cacheSize uint16) *Parser {
	cfg := NewConfigWithID("test")
	cfg.Pattern = pattern
	if cacheSize > 0 {
		cfg.Cache.Size = cacheSize
	}
	op, err := cfg.Build(testutil.Logger(t))
	require.NoError(t, err)
	return op.(*Parser)
}

func TestParserBuildFailure(t *testing.T) {
	cfg := NewConfigWithID("test")
	cfg.OnError = "invalid_on_error"
	_, err := cfg.Build(testutil.Logger(t))
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid `on_error` field")
}

func TestParserByteFailure(t *testing.T) {
	parser := newTestParser(t, "%{COMMONAPACHELOG}", 0)
	_, err := parser.parse([]byte("invalid"))
	require.Error(t, err)
	require.Contains(t, err.Error(), "type '[]uint8' cannot be parsed as grok")
}

func TestParserInvalidType(t *testing.T) {
	parser := newTestParser(t, "%{COMMONAPACHELOG}", 0)
	_, err := parser.parse([]int{})
	require.Error(t, err)
	require.Contains(t, err.Error(), "type '[]int' cannot be parsed as grok")
}

func TestParserStringEmpty(t *testing.T) {
	parser := newTestParser(t, "%{COMMONAPACHELOG}", 0)
	res, err := parser.parse("invalid")
	require.NoError(t, err)
	require.Equal(t, 0, len(res.(map[string]interface{})))
}

func TestParserCache(t *testing.T) {
	parser := newTestParser(t, "%{COMMONAPACHELOG}", 100)
	require.NotNil(t, parser.cache, "expected cache to be configured")
	require.Equal(t, parser.cache.maxSize(), uint16(100))
}

func TestParserGrok(t *testing.T) {
	cases := []struct {
		name      string
		configure func(*Config)
		input     *entry.Entry
		expected  *entry.Entry
	}{
		{
			"grok pattern with name specified",
			func(p *Config) {
				p.Pattern = "a=%{NOTSPACE:data}"
				p.Cache.Size = 100
			},
			&entry.Entry{
				Body: "a=b",
			},
			&entry.Entry{
				Body: "a=b",
				Attributes: map[string]interface{}{
					"data": "b",
				},
			},
		},
		{
			"use existing grok template",
			func(p *Config) {
				p.Pattern = `%{COMMONAPACHELOG}`
				p.Cache.Size = 100
			},
			&entry.Entry{
				Body: apacheCommonLog,
			},
			&entry.Entry{
				Body: apacheCommonLog,
				Attributes: map[string]interface{}{
					"ident":       "-",
					"httpversion": "2.0",
					"rawrequest":  "",
					"bytes":       "25439",
					"clientip":    "252.18.112.145",
					"auth":        "kshlerin6026",
					"timestamp":   "23/Dec/2022:04:37:05 +0000",
					"verb":        "POST",
					"request":     "/architectures/back-end/relationships/value-added",
					"response":    "203",
				},
			},
		},
		{
			"grok pattern with type specified",
			func(p *Config) {
				p.Pattern = `%{IPV4:ip:string} %{NUMBER:status:int} %{NUMBER:duration:float}`
				p.Cache.Size = 100
			},
			&entry.Entry{
				Body: "127.0.0.1 200 0.8",
			},
			&entry.Entry{
				Body: "127.0.0.1 200 0.8",
				Attributes: map[string]interface{}{
					"ip":       "127.0.0.1",
					"status":   200,
					"duration": 0.8,
				},
			},
		},
		{
			"parser with include in config",
			func(p *Config) {
				p.Pattern = `%{COMMONAPACHELOG}`
				p.Cache.Size = 100
				p.Include = []string{"timestamp", "auth", "response"}
			},
			&entry.Entry{
				Body: apacheCommonLog,
			},
			&entry.Entry{
				Body: apacheCommonLog,
				Attributes: map[string]interface{}{
					"auth":      "kshlerin6026",
					"timestamp": "23/Dec/2022:04:37:05 +0000",
					"response":  "203",
				},
			},
		},
		{
			"parser with exclude in config",
			func(p *Config) {
				p.Pattern = `%{COMMONAPACHELOG}`
				p.Cache.Size = 100
				p.Exclude = []string{"ident", "httpversion", "rawrequest", "bytes", "clientip", "request"}
			},
			&entry.Entry{
				Body: apacheCommonLog,
			},
			&entry.Entry{
				Body: apacheCommonLog,
				Attributes: map[string]interface{}{
					"auth":      "kshlerin6026",
					"timestamp": "23/Dec/2022:04:37:05 +0000",
					"verb":      "POST",
					"response":  "203",
				},
			},
		},
		{
			"parser with both include and exclude in config",
			func(p *Config) {
				p.Pattern = `%{COMMONAPACHELOG}`
				p.Cache.Size = 100
				p.Exclude = []string{"httpversion", "rawrequest", "bytes", "clientip", "request", "ident"}
				p.Include = []string{"timestamp", "auth", "response", "ident"}
			},
			&entry.Entry{
				Body: apacheCommonLog,
			},
			&entry.Entry{
				Body: apacheCommonLog,
				Attributes: map[string]interface{}{
					"auth":      "kshlerin6026",
					"timestamp": "23/Dec/2022:04:37:05 +0000",
					"response":  "203",
				},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cfg := NewConfigWithID("test")
			cfg.OutputIDs = []string{"fake"}
			tc.configure(cfg)

			op, err := cfg.Build(testutil.Logger(t))
			require.NoError(t, err)

			fake := testutil.NewFakeOutput(t)
			require.NoError(t, op.SetOutputs([]operator.Operator{fake}))

			ots := time.Now()
			tc.input.ObservedTimestamp = ots
			tc.expected.ObservedTimestamp = ots

			err = op.Process(context.Background(), tc.input)
			require.NoError(t, err)

			fake.ExpectEntry(t, tc.expected)
		})
	}
}

// return 100 unique file names, example:
// dafplsjfbcxoeff-5644d7b6d9-mzngq_kube-system_coredns-901f7510281180a402936c92f5bc0f3557f5a21ccb5a4591c5bf98f3ddbffdd6.log
// rswxpldnjobcsnv-5644d7b6d9-mzngq_kube-system_coredns-901f7510281180a402936c92f5bc0f3557f5a21ccb5a4591c5bf98f3ddbffdd6.log
// lgtemapezqleqyh-5644d7b6d9-mzngq_kube-system_coredns-901f7510281180a402936c92f5bc0f3557f5a21ccb5a4591c5bf98f3ddbffdd6.log
func benchParseInput() (patterns []string) {
	const letterBytes = "abcdefghijklmnopqrstuvwxyz"
	for i := 1; i <= 100; i++ {
		b := make([]byte, 15)
		for i := range b {
			b[i] = letterBytes[rand.Intn(len(letterBytes))]
		}
		randomStr := string(b)
		p := fmt.Sprintf("%s-5644d7b6d9-mzngq_kube-system_coredns-901f7510281180a402936c92f5bc0f3557f5a21ccb5a4591c5bf98f3ddbffdd6.log", randomStr)
		patterns = append(patterns, p)
	}
	return patterns
}

// Grok pattern use to parse a apache common log
const benchParsePattern = `%{DATA:podname}_%{DATA:namespace}_%{GREEDYDATA:container_name}-%{WORD:container_id}.log`

var benchParsePatterns = benchParseInput()

func newTestBenchParser(t *testing.T, cacheSize uint16) *Parser {
	cfg := NewConfigWithID("bench")
	cfg.Pattern = benchParsePattern
	cfg.Cache.Size = cacheSize

	op, err := cfg.Build(testutil.Logger(t))
	require.NoError(t, err)
	return op.(*Parser)
}

func benchmarkParseThreaded(b *testing.B, parser *Parser, input []string) {
	wg := sync.WaitGroup{}

	for _, i := range input {
		wg.Add(1)

		go func(i string) {
			if _, err := parser.match(i); err != nil {
				b.Error(err)
			}
			wg.Done()
		}(i)
	}

	wg.Wait()
}

func benchmarkParse(b *testing.B, parser *Parser, input []string) {
	for _, i := range input {
		if _, err := parser.match(i); err != nil {
			b.Error(err)
		}
	}
}

// No cache
func BenchmarkParseNoCache(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 0)
	for n := 0; n < b.N; n++ {
		benchmarkParseThreaded(b, parser, benchParsePatterns)
	}
}

// Memory cache at capacity
func BenchmarkParseWithMemoryCache(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 100)
	for n := 0; n < b.N; n++ {
		benchmarkParseThreaded(b, parser, benchParsePatterns)
	}
}

// Memory cache over capacity by one
func BenchmarkParseWithMemoryCacheFullByOne(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 99)
	for n := 0; n < b.N; n++ {
		benchmarkParseThreaded(b, parser, benchParsePatterns)
	}
}

// Memory cache over capacity by 10
func BenchmarkParseWithMemoryCacheFullBy10(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 90)
	for n := 0; n < b.N; n++ {
		benchmarkParseThreaded(b, parser, benchParsePatterns)
	}
}

// Memory cache over capacity by 50
func BenchmarkParseWithMemoryCacheFullBy50(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 50)
	for n := 0; n < b.N; n++ {
		benchmarkParseThreaded(b, parser, benchParsePatterns)
	}
}

// Memory cache over capacity by 90
func BenchmarkParseWithMemoryCacheFullBy90(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 10)
	for n := 0; n < b.N; n++ {
		benchmarkParseThreaded(b, parser, benchParsePatterns)
	}
}

// Memory cache over capacity by 99
func BenchmarkParseWithMemoryCacheFullBy99(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 1)
	for n := 0; n < b.N; n++ {
		benchmarkParseThreaded(b, parser, benchParsePatterns)
	}
}

// No cache one file
func BenchmarkParseNoCacheOneFile(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 0)
	for n := 0; n < b.N; n++ {
		pattern := []string{benchParsePatterns[0]}
		benchmarkParse(b, parser, pattern)
	}
}

// Memory cache one file
func BenchmarkParseWithMemoryCacheOneFile(b *testing.B) {
	parser := newTestBenchParser(&testing.T{}, 100)
	for n := 0; n < b.N; n++ {
		pattern := []string{benchParsePatterns[0]}
		benchmarkParse(b, parser, pattern)
	}
}

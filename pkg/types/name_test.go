package types

import (
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/util/validation"
)

func TestGenerateName(t *testing.T) {
	testCases := []struct {
		name       string
		input      string
		wantPrefix string
	}{
		{name: "WordsWithSpaces_Hyphenated", input: "My Dashboard", wantPrefix: "my-dashboard"},
		{name: "Punctuation_Collapsed", input: "Hello, World!", wantPrefix: "hello-world"},
		{name: "SurroundingWhitespace_Trimmed", input: "  hello  ", wantPrefix: "hello"},
		{name: "SurroundingHyphens_Trimmed", input: "---abc---", wantPrefix: "abc"},
		{name: "ConsecutiveNonAlphanumerics_Collapsed", input: "a___b...c", wantPrefix: "a-b-c"},
		{name: "Digits_Preserved", input: "Region us-east-1", wantPrefix: "region-us-east-1"},
		{name: "NoAlphanumerics_SuffixOnly", input: "!!! ???", wantPrefix: ""},
		{name: "OverLongPrefix_TruncatedToLabelLimit", input: strings.Repeat("a", 100), wantPrefix: strings.Repeat("a", 63-1-GeneratedNameSuffixLen)},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got := GenerateName(testCase.input)

			assert.LessOrEqual(t, len(got), 63)
			assert.Empty(t, validation.IsDNS1123Label(got), "result must be a valid DNS-1123 label")
			if testCase.wantPrefix == "" {
				assert.Len(t, got, GeneratedNameSuffixLen)
				return
			}
			assert.True(t, strings.HasPrefix(got, testCase.wantPrefix+"-"), "expected prefix %q, got %q", testCase.wantPrefix+"-", got)
			assert.Len(t, got, len(testCase.wantPrefix)+1+GeneratedNameSuffixLen)
		})
	}
}

func TestGenerateName_SameInput_SuffixDiffers(t *testing.T) {
	assert.NotEqual(t, GenerateName("collision-test"), GenerateName("collision-test"))
}

func TestGenerateCloneName(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		maxLen   int
		expected string
	}{
		{name: "PlainName_CopySuffixAppended", input: "My Dashboard", expected: "My Dashboard - Copy"},
		{name: "CopySuffix_BumpedToTwo", input: "My Dashboard - Copy", expected: "My Dashboard - Copy (2)"},
		{name: "NumberedSuffix_Incremented", input: "My Dashboard - Copy (2)", expected: "My Dashboard - Copy (3)"},
		{name: "MultiDigitSuffix_Incremented", input: "svc - Copy (41)", expected: "svc - Copy (42)"},
		{name: "ContainsCopyWord_NotTreatedAsSuffix", input: "Copy of things", expected: "Copy of things - Copy"},
		{name: "RepeatedCopy_OnlyTrailingMarkerParsed", input: "Prod - Copy - Copy", expected: "Prod - Copy - Copy (2)"},
		{name: "EmptyName_SuffixOnly", input: "", expected: " - Copy"},
		{
			name:     "NoLimit_LongNameNotTruncated",
			input:    "Muting And Manual Resolving Log Based Alert 7 October With A Very Long Descriptive Name That Goes On And On Past One Hundred Twenty Eight Characters",
			expected: "Muting And Manual Resolving Log Based Alert 7 October With A Very Long Descriptive Name That Goes On And On Past One Hundred Twenty Eight Characters - Copy",
		},
		{
			name:     "AtLimit_FirstCopy_BaseTruncatedSuffixKept",
			input:    "Production Kubernetes Cluster Health: CPU, Memory, Disk I/O, and Network Saturation Across Every Namespace and Availability Zone",
			maxLen:   128,
			expected: "Production Kubernetes Cluster Health: CPU, Memory, Disk I/O, and Network Saturation Across Every Namespace and Availabili - Copy",
		},
		{
			name:     "AtLimit_NumberedCopy_IncrementedThenTruncated",
			input:    "API Gateway SLOs: p99 Latency, Error Budget Burn Rate, and Requests per Second by Route, Region, and Upstream Service - Copy (9)",
			maxLen:   128,
			expected: "API Gateway SLOs: p99 Latency, Error Budget Burn Rate, and Requests per Second by Route, Region, and Upstream Servic - Copy (10)",
		},
		{
			name:     "AtLimit_MultiByteRunes_TruncatedByRunes",
			input:    "Café Latency: p99 Response Times, Error Rates, and Saturation Across the Ordering, Kitchen, and Delivery Microservices Für All",
			maxLen:   128,
			expected: "Café Latency: p99 Response Times, Error Rates, and Saturation Across the Ordering, Kitchen, and Delivery Microservices Fü - Copy",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got := GenerateCloneName(testCase.input, testCase.maxLen)

			assert.Equal(t, testCase.expected, got)
			if testCase.maxLen > 0 {
				assert.LessOrEqual(t, utf8.RuneCountInString(got), testCase.maxLen)
			}
		})
	}
}

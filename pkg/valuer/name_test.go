package valuer

import (
	"testing"
	"unicode/utf8"

	"github.com/stretchr/testify/assert"
)

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

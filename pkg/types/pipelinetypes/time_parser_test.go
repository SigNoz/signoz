package pipelinetypes

import (
	"regexp"
	"testing"

	"github.com/SigNoz/signoz-otel-collector/processor/signozlogspipelineprocessor/stanza/operator/helper/ctimefmt"
	"github.com/stretchr/testify/require"
)

func TestRegexForStrptimeLayoutMatchesCompleteValue(t *testing.T) {
	tests := []struct {
		name    string
		layout  string
		value   string
		matches bool
	}{
		{
			name:    "full timestamp",
			layout:  "%Y-%m-%dT%H:%M:%S.%f%z",
			value:   "2023-11-26T12:03:28.239907+0530",
			matches: true,
		},
		{
			name:    "unpadded two-digit month",
			layout:  "%Y-%q-%d",
			value:   "2023-12-26",
			matches: true,
		},
		{
			name:    "trailing garbage",
			layout:  "%A, %d. %B %Y %I:%M%p",
			value:   "Tuesday, 21. November 2006 04:30PM11/03/02",
			matches: false,
		},
		{
			name:    "leading garbage",
			layout:  "%Y-%m-%d",
			value:   "date=2023-11-26",
			matches: false,
		},
		{
			name:    "literal regexp characters",
			layout:  "[%Y].%m+%d",
			value:   "[2023].11+26",
			matches: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			generated, err := RegexForStrptimeLayout(test.layout)
			require.NoError(t, err)
			require.Equal(t, test.matches, regexp.MustCompile(generated).MatchString(test.value))
		})
	}
}

func TestRegexForStrptimeLayoutSupportsEveryCollectorDirective(t *testing.T) {
	tests := []struct {
		directive string
		layout    string
		value     string
	}{
		{directive: "%Y", layout: "%Y", value: "2023"},
		{directive: "%y", layout: "%y", value: "23"},
		{directive: "%m", layout: "%m", value: "12"},
		{directive: "%o", layout: "%o", value: "_1"},
		{directive: "%q", layout: "%q", value: "12"},
		{directive: "%b", layout: "%b", value: "Nov"},
		{directive: "%h", layout: "%h", value: "Nov"},
		{directive: "%B", layout: "%B", value: "November"},
		{directive: "%d", layout: "%d", value: "26"},
		{directive: "%e", layout: "%e", value: " 6"},
		{directive: "%g", layout: "%g", value: "26"},
		{directive: "%a", layout: "%a", value: "Sun"},
		{directive: "%A", layout: "%A", value: "Sunday"},
		{directive: "%H", layout: "%H", value: "23"},
		{directive: "%l", layout: "%l", value: "12"},
		{directive: "%I", layout: "%I", value: "12"},
		{directive: "%p", layout: "%I %p", value: "03 PM"},
		{directive: "%P", layout: "%I %P", value: "03 pm"},
		{directive: "%M", layout: "%H:%M", value: "12:59"},
		{directive: "%S", layout: "%H:%M:%S", value: "12:03:59"},
		{directive: "%L", layout: "%H:%M:%S.%L", value: "12:03:28.239"},
		{directive: "%f", layout: "%H:%M:%S.%f", value: "12:03:28.239907"},
		{directive: "%s", layout: "%H:%M:%S.%s", value: "12:03:28.23990712"},
		{directive: "%Z", layout: "%Z", value: "UTC"},
		{directive: "%z", layout: "%z", value: "+0530"},
		{directive: "%w", layout: "%w", value: "+053000"},
		{directive: "%i", layout: "%i", value: "+05"},
		{directive: "%j", layout: "%j", value: "+05:30"},
		{directive: "%k", layout: "%k", value: "+05:30:00"},
		{directive: "%D", layout: "%D", value: "11/26/2023"},
		{directive: "%x", layout: "%x", value: "11/26/2023"},
		{directive: "%F", layout: "%F", value: "2023-11-26"},
		{directive: "%T", layout: "%T", value: "12:03:28"},
		{directive: "%X", layout: "%X", value: "12:03:28"},
		{directive: "%r", layout: "%r", value: "03:04:05 pm"},
		{directive: "%R", layout: "%R", value: "23:59"},
		{directive: "%n", layout: "%Y%n%m", value: "2023\n11"},
		{directive: "%t", layout: "%Y%t%m", value: "2023\t11"},
		{directive: "%%", layout: "%Y%%", value: "2023%"},
		{directive: "%c", layout: "%c", value: "Sun Nov 26 12:03:28 2023"},
	}

	require.Len(t, tests, len(ctimeRegex), "every supported directive must have a test case")
	for _, test := range tests {
		t.Run(test.directive, func(t *testing.T) {
			generated, err := RegexForStrptimeLayout(test.layout)
			require.NoError(t, err)
			require.True(t, regexp.MustCompile(generated).MatchString(test.value), "generated regex rejected a valid value")
			_, err = ctimefmt.Parse(test.layout, test.value)
			require.NoError(t, err, "collector parser rejected the test value")
		})
	}
}

func TestRegexForStrptimeLayoutRejectsInvalidLayouts(t *testing.T) {
	for _, layout := range []string{"%", "%Q", "%Y-%"} {
		t.Run(layout, func(t *testing.T) {
			generated, err := RegexForStrptimeLayout(layout)
			require.Error(t, err)
			require.Empty(t, generated)
		})
	}
}

func TestRegexForStrptimeLayoutRejectsValuesCollectorCannotParse(t *testing.T) {
	tests := []struct {
		layout string
		value  string
	}{
		{layout: "%q", value: "13"},
		{layout: "%H", value: "24"},
		{layout: "%M", value: "60"},
		{layout: "%Z", value: "abc"},
		{layout: "%z", value: "+2561"},
	}

	for _, test := range tests {
		t.Run(test.layout+"_"+test.value, func(t *testing.T) {
			generated, err := RegexForStrptimeLayout(test.layout)
			require.NoError(t, err)
			require.False(t, regexp.MustCompile(generated).MatchString(test.value))
			_, err = ctimefmt.Parse(test.layout, test.value)
			require.Error(t, err)
		})
	}
}

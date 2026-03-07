package pipelinetypes

import (
	"fmt"
	"testing"

	"github.com/antonmedv/expr"
	"github.com/stretchr/testify/require"
)

func TestRegexForStrptimeLayout(t *testing.T) {
	require := require.New(t)

	var testCases = []struct {
		strptimeLayout string
		str            string
		shouldMatch    bool
	}{
		{
			strptimeLayout: "%Y-%m-%dT%H:%M:%S.%f%z",
			str:            "2023-11-26T12:03:28.239907+0530",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%d-%m-%Y",
			str:            "26-11-2023",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%d/%m/%y",
			str:            "11/03/02",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%A, %d. %B %Y %I:%M%p",
			str:            "Tuesday, 21. November 2006 04:30PM11/03/02",
			shouldMatch:    true,
		}, {
			strptimeLayout: "%A, %d. %B %Y %I:%M%p",
			str:            "some random text",
			shouldMatch:    false,
		},
	}

	for _, test := range testCases {
		regex, err := RegexForStrptimeLayout(test.strptimeLayout)
		require.Nil(err, test.strptimeLayout)

		code := fmt.Sprintf(`"%s" matches "%s"`, test.str, regex)
		program, err := expr.Compile(code)
		require.Nil(err, test.strptimeLayout)

		output, err := expr.Run(program, map[string]string{})
		require.Nil(err, test.strptimeLayout)
		require.Equal(test.shouldMatch, output, test.strptimeLayout)

	}
}

package impldashboard

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildContainsAnyClauseForDataColumn(t *testing.T) {
	cases := []struct {
		subtestName  string
		searches     []string
		expectedSQL  string
		expectedArgs []any
	}{
		{
			subtestName:  "single search",
			searches:     []string{"http.server.duration"},
			expectedSQL:  `(data LIKE ? ESCAPE '\')`,
			expectedArgs: []any{`%http.server.duration%`},
		},
		{
			subtestName:  "multiple searches are OR-ed",
			searches:     []string{"metric.a", "metric.b", "metric.c"},
			expectedSQL:  `(data LIKE ? ESCAPE '\' OR data LIKE ? ESCAPE '\' OR data LIKE ? ESCAPE '\')`,
			expectedArgs: []any{`%metric.a%`, `%metric.b%`, `%metric.c%`},
		},
		{
			subtestName:  "like wildcards in the search are escaped",
			searches:     []string{`a%b_c\d`},
			expectedSQL:  `(data LIKE ? ESCAPE '\')`,
			expectedArgs: []any{`%a\%b\_c\\d%`},
		},
	}

	for _, c := range cases {
		t.Run(c.subtestName, func(t *testing.T) {
			clause, args := buildContainsAnyClauseForDataColumn(formatter(t), c.searches)
			assert.Equal(t, c.expectedSQL, clause)
			assert.Equal(t, c.expectedArgs, args)
		})
	}
}

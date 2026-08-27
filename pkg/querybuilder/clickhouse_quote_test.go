package querybuilder

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestClickHouseQuoting(t *testing.T) {
	t.Run("string literal", func(t *testing.T) {
		assert.Equal(t, `'name\'\\); SELECT 1 --'`, ClickHouseStringLiteral(`name'\); SELECT 1 --`))
	})

	t.Run("identifier", func(t *testing.T) {
		assert.Equal(t, "`name\\`\\\\); SELECT 1 --`", ClickHouseIdentifier("name`\\); SELECT 1 --"))
	})
}

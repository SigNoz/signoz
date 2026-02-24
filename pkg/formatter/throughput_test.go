package formatter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestThroughput(t *testing.T) {
	throughputFormatter := NewThroughputFormatter()

	assert.Equal(t, "10 req/s", throughputFormatter.Format(10, "reqps"))
	assert.Equal(t, "10 req/s", throughputFormatter.Format(10, "{req}/s"))
	assert.Equal(t, "1K req/s", throughputFormatter.Format(1000, "reqps"))
	assert.Equal(t, "1K req/s", throughputFormatter.Format(1000, "{req}/s"))
	assert.Equal(t, "1M req/s", throughputFormatter.Format(1000000, "reqps"))
	assert.Equal(t, "1M req/s", throughputFormatter.Format(1000000, "{req}/s"))
	assert.Equal(t, "10 c/m", throughputFormatter.Format(10, "cpm"))
	assert.Equal(t, "10 c/m", throughputFormatter.Format(10, "{count}/min"))
}

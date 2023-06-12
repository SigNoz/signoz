package formatter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestData(t *testing.T) {
	dataFormatter := NewDataFormatter()

	assert.Equal(t, "1 B", dataFormatter.Format(1, "bytes"))
	assert.Equal(t, "1.0 KiB", dataFormatter.Format(1024, "bytes"))
	assert.Equal(t, "2.3 GiB", dataFormatter.Format(2.3*1024, "mbytes"))
	assert.Equal(t, "1.0 MiB", dataFormatter.Format(1024*1024, "bytes"))
	assert.Equal(t, "69 TiB", dataFormatter.Format(69*1024*1024, "mbytes"))
	assert.Equal(t, "102 KiB", dataFormatter.Format(102*1024, "bytes"))
	assert.Equal(t, "240 MiB", dataFormatter.Format(240*1024, "kbytes"))
	assert.Equal(t, "1.0 GiB", dataFormatter.Format(1024*1024, "kbytes"))
	assert.Equal(t, "23 GiB", dataFormatter.Format(23*1024*1024, "kbytes"))
	assert.Equal(t, "32 TiB", dataFormatter.Format(32*1024*1024*1024, "kbytes"))
	assert.Equal(t, "24 MiB", dataFormatter.Format(24, "mbytes"))
}

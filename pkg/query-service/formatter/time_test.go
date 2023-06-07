package formatter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDuration(t *testing.T) {
	durationFormatter := NewDurationFormatter()

	assert.Equal(t, "1 s", durationFormatter.Format(1, "s"))
	assert.Equal(t, "5 µs", durationFormatter.Format(5000, "ns"))
	assert.Equal(t, "1 min", durationFormatter.Format(60, "s"))
	assert.Equal(t, "18.2 min", durationFormatter.Format(1092000000000, "ns"))
	assert.Equal(t, "20 min", durationFormatter.Format(1200, "s"))
	assert.Equal(t, "3.40 µs", durationFormatter.Format(3400, "ns"))
	assert.Equal(t, "1 µs", durationFormatter.Format(1000, "ns"))
	assert.Equal(t, "1 s", durationFormatter.Format(1000, "ms"))
	assert.Equal(t, "2 day", durationFormatter.Format(172800, "s"))
	assert.Equal(t, "4 week", durationFormatter.Format(2419200, "s"))
	assert.Equal(t, "1.01 year", durationFormatter.Format(31736420, "s"))
	assert.Equal(t, "38.5 year", durationFormatter.Format(2000, "w"))
	assert.Equal(t, "1 ns", durationFormatter.Format(1, "ns"))
	assert.Equal(t, "69 ms", durationFormatter.Format(69000000, "ns"))
	assert.Equal(t, "1.82 min", durationFormatter.Format(109200000000, "ns"))
	assert.Equal(t, "1.27 day", durationFormatter.Format(109800000000000, "ns"))
	assert.Equal(t, "2 day", durationFormatter.Format(172800000, "ms"))
}

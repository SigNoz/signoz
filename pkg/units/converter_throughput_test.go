package units

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestThroughputConverter(t *testing.T) {
	throughputConverter := NewThroughputConverter()

	assert.Equal(t, Value{F: 1, U: "cps"}, throughputConverter.Convert(Value{F: 1, U: "cps"}, "cps"))
	assert.Equal(t, Value{F: 60, U: "cpm"}, throughputConverter.Convert(Value{F: 1, U: "cps"}, "cpm"))
	assert.Equal(t, Value{F: 2, U: "cps"}, throughputConverter.Convert(Value{F: 120, U: "cpm"}, "cps"))
	assert.Equal(t, Value{F: 2, U: "ops"}, throughputConverter.Convert(Value{F: 120, U: "opm"}, "ops"))
	assert.Equal(t, Value{F: 2, U: "rps"}, throughputConverter.Convert(Value{F: 120, U: "rpm"}, "rps"))
	assert.Equal(t, Value{F: 2, U: "wps"}, throughputConverter.Convert(Value{F: 120, U: "wpm"}, "wps"))
	assert.Equal(t, Value{F: 2, U: "{count}/s"}, throughputConverter.Convert(Value{F: 120, U: "{count}/min"}, "{count}/s"))
	assert.Equal(t, Value{F: 120, U: "{ops}/min"}, throughputConverter.Convert(Value{F: 2, U: "{ops}/s"}, "{ops}/min"))
	assert.Equal(t, Value{F: 5, U: "ops"}, throughputConverter.Convert(Value{F: 5, U: "cps"}, "ops"))
}

package converter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPercentConverter(t *testing.T) {
	percentConverter := NewPercentConverter()

	assert.Equal(t, Value{F: 1, U: "percent"}, percentConverter.Convert(Value{F: 1, U: "percent"}, "percent"))
	assert.Equal(t, Value{F: 100, U: "percent"}, percentConverter.Convert(Value{F: 1, U: "percentunit"}, "percent"))
	assert.Equal(t, Value{F: 1, U: "percentunit"}, percentConverter.Convert(Value{F: 100, U: "percent"}, "percentunit"))
	assert.Equal(t, Value{F: 0.01, U: "percentunit"}, percentConverter.Convert(Value{F: 1, U: "percent"}, "percentunit"))
}

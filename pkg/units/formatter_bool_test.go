package units

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBool(t *testing.T) {
	boolFormatter := NewBoolFormatter()

	assert.Equal(t, "false", boolFormatter.Format(0, "bool"))
	assert.Equal(t, "true", boolFormatter.Format(1, "bool"))
	assert.Equal(t, "no", boolFormatter.Format(0, "bool_yes_no"))
	assert.Equal(t, "yes", boolFormatter.Format(1, "bool_yes_no"))
	assert.Equal(t, "off", boolFormatter.Format(0, "bool_on_off"))
	assert.Equal(t, "on", boolFormatter.Format(1, "bool_on_off"))
}

// Every bool unit that the formatter implements must be routed to it.
func TestFormatterFromUnitBool(t *testing.T) {
	assert.Equal(t, "false", FormatterFromUnit("bool").Format(0, "bool"))
	assert.Equal(t, "yes", FormatterFromUnit("bool_yes_no").Format(1, "bool_yes_no"))
	assert.Equal(t, "off", FormatterFromUnit("bool_on_off").Format(0, "bool_on_off"))
	assert.Equal(t, "on", FormatterFromUnit("bool_on_off").Format(1, "bool_on_off"))
}

func TestConverterFromUnitBool(t *testing.T) {
	assert.Equal(t, BoolConverter, ConverterFromUnit("bool_on_off"))
}

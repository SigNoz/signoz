package converter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestData(t *testing.T) {
	dataConverter := NewDataConverter()
	// 8 bits = 1 byte
	assert.Equal(t, Value{F: 1, U: "bytes"}, dataConverter.Convert(Value{F: 8, U: "bits"}, "bytes"))
	assert.Equal(t, Value{F: 1, U: "By"}, dataConverter.Convert(Value{F: 8, U: "bits"}, "By"))
	// 1024 bytes = 1 kbytes
	assert.Equal(t, Value{F: 1, U: "kbytes"}, dataConverter.Convert(Value{F: 1024, U: "bytes"}, "kbytes"))
	assert.Equal(t, Value{F: 1, U: "kBy"}, dataConverter.Convert(Value{F: 1000, U: "bytes"}, "kBy"))
	// 1 byte = 8 bits
	assert.Equal(t, Value{F: 8, U: "bits"}, dataConverter.Convert(Value{F: 1, U: "bytes"}, "bits"))
	// 1 mbytes = 1024 kbytes
	assert.Equal(t, Value{F: 1024, U: "kbytes"}, dataConverter.Convert(Value{F: 1, U: "mbytes"}, "kbytes"))
	// 1 kbytes = 1024 bytes
	assert.Equal(t, Value{F: 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "kbytes"}, "bytes"))
	// 1024 kbytes = 1 mbytes
	assert.Equal(t, Value{F: 1, U: "mbytes"}, dataConverter.Convert(Value{F: 1024, U: "kbytes"}, "mbytes"))
	assert.Equal(t, Value{F: 1, U: "MBy"}, dataConverter.Convert(Value{F: 1000, U: "kBy"}, "MBy"))
	// 1 mbytes = 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "mbytes"}, "bytes"))
	// 1024 mbytes = 1 gbytes
	assert.Equal(t, Value{F: 1, U: "gbytes"}, dataConverter.Convert(Value{F: 1024, U: "mbytes"}, "gbytes"))
	// 1 gbytes = 1024 mbytes
	assert.Equal(t, Value{F: 1024, U: "mbytes"}, dataConverter.Convert(Value{F: 1, U: "gbytes"}, "mbytes"))
	// 1 gbytes = 1024 * 1024 kbytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "kbytes"}, dataConverter.Convert(Value{F: 1, U: "gbytes"}, "kbytes"))
	// 1 gbytes = 1024 * 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024 * 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "gbytes"}, "bytes"))
	// 1024 gbytes = 1 tbytes
	assert.Equal(t, Value{F: 1, U: "tbytes"}, dataConverter.Convert(Value{F: 1024, U: "gbytes"}, "tbytes"))
	// 1 tbytes = 1024 gbytes
	assert.Equal(t, Value{F: 1024, U: "gbytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "gbytes"))
	// 1 tbytes = 1024 * 1024 mbytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "mbytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "mbytes"))
	// 1 tbytes = 1024 * 1024 * 1024 kbytes
	assert.Equal(t, Value{F: 1024 * 1024 * 1024, U: "kbytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "kbytes"))
	// 1 tbytes = 1024 * 1024 * 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024 * 1024 * 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "bytes"))
	// 1024 tbytes = 1 pbytes
	assert.Equal(t, Value{F: 1, U: "pbytes"}, dataConverter.Convert(Value{F: 1024, U: "tbytes"}, "pbytes"))
	// 1024 tbytes = 1 PiBy
	assert.Equal(t, Value{F: 1, U: "PiBy"}, dataConverter.Convert(Value{F: 1024, U: "tbytes"}, "PiBy"))
	// 1 pbytes = 1024 tbytes
	assert.Equal(t, Value{F: 1024, U: "tbytes"}, dataConverter.Convert(Value{F: 1, U: "pbytes"}, "tbytes"))
	// 1024 TiBy = 1 pbytes
	assert.Equal(t, Value{F: 1024, U: "TiBy"}, dataConverter.Convert(Value{F: 1, U: "pbytes"}, "TiBy"))
}

func TestDataConversionUCUMUnit(t *testing.T) {
	dataConverter := NewDataConverter()

	tests := []struct {
		name     string
		input    Value
		toUnit   Unit
		expected Value
	}{
		// Bits to bytes
		{name: "Bits to bytes: 8 bit = 1 By", input: Value{F: 8, U: "bit"}, toUnit: "By", expected: Value{F: 1, U: "By"}},
		{name: "Byte to bits: 1 By = 8 bit", input: Value{F: 1, U: "By"}, toUnit: "bit", expected: Value{F: 8, U: "bit"}},
		// Binary byte scaling
		{name: "Binary byte scaling: 1024 By = 1 KiBy", input: Value{F: 1024, U: "By"}, toUnit: "KiBy", expected: Value{F: 1, U: "KiBy"}},
		{name: "Kibibyte to bytes: 1 KiBy = 1024 By", input: Value{F: 1, U: "KiBy"}, toUnit: "By", expected: Value{F: 1024, U: "By"}},
		{name: "Binary byte scaling: 1024 KiBy = 1 MiBy", input: Value{F: 1024, U: "KiBy"}, toUnit: "MiBy", expected: Value{F: 1, U: "MiBy"}},
		{name: "Binary byte scaling: 1024 MiBy = 1 GiBy", input: Value{F: 1024, U: "MiBy"}, toUnit: "GiBy", expected: Value{F: 1, U: "GiBy"}},
		{name: "Gibibyte to mebibyte: 1 GiBy = 1024 MiBy", input: Value{F: 1, U: "GiBy"}, toUnit: "MiBy", expected: Value{F: 1024, U: "MiBy"}},
		{name: "Binary byte scaling: 1024 GiBy = 1 TiBy", input: Value{F: 1024, U: "GiBy"}, toUnit: "TiBy", expected: Value{F: 1, U: "TiBy"}},
		{name: "Binary byte scaling: 1024 TiBy = 1 PiBy", input: Value{F: 1024, U: "TiBy"}, toUnit: "PiBy", expected: Value{F: 1, U: "PiBy"}},
		{name: "Pebibyte to tebibyte: 1 PiBy = 1024 TiBy", input: Value{F: 1, U: "PiBy"}, toUnit: "TiBy", expected: Value{F: 1024, U: "TiBy"}},
		{name: "Gibibyte to bytes: 1 GiBy = 1073741824 By", input: Value{F: 1, U: "GiBy"}, toUnit: "By", expected: Value{F: 1024 * 1024 * 1024, U: "By"}},
		{name: "Tebibyte to bytes: 1 TiBy = 1099511627776 By", input: Value{F: 1, U: "TiBy"}, toUnit: "By", expected: Value{F: 1024 * 1024 * 1024 * 1024, U: "By"}},
		// SI bit scaling
		{name: "SI bit scaling: 1000 bit = 1 kbit", input: Value{F: 1000, U: "bit"}, toUnit: "kbit", expected: Value{F: 1, U: "kbit"}},
		{name: "Kilobit to bits: 1 kbit = 1000 bit", input: Value{F: 1, U: "kbit"}, toUnit: "bit", expected: Value{F: 1000, U: "bit"}},
		{name: "SI bit scaling: 1000 kbit = 1 Mbit", input: Value{F: 1000, U: "kbit"}, toUnit: "Mbit", expected: Value{F: 1, U: "Mbit"}},
		{name: "Gigabit to bits: 1 Gbit = 1000000000 bit", input: Value{F: 1, U: "Gbit"}, toUnit: "bit", expected: Value{F: 1000 * 1000 * 1000, U: "bit"}},
		{name: "SI bit scaling: 1000 Mbit = 1 Gbit", input: Value{F: 1000, U: "Mbit"}, toUnit: "Gbit", expected: Value{F: 1, U: "Gbit"}},
		{name: "Gigabit to megabit: 1 Gbit = 1000 Mbit", input: Value{F: 1, U: "Gbit"}, toUnit: "Mbit", expected: Value{F: 1000, U: "Mbit"}},
		{name: "SI bit scaling: 1000 Gbit = 1 Tbit", input: Value{F: 1000, U: "Gbit"}, toUnit: "Tbit", expected: Value{F: 1, U: "Tbit"}},
		{name: "Terabit to gigabit: 1 Tbit = 1000 Gbit", input: Value{F: 1, U: "Tbit"}, toUnit: "Gbit", expected: Value{F: 1000, U: "Gbit"}},
		{name: "SI bit scaling: 1000 Tbit = 1 Pbit", input: Value{F: 1000, U: "Tbit"}, toUnit: "Pbit", expected: Value{F: 1, U: "Pbit"}},
		{name: "Petabit to terabit: 1 Pbit = 1000 Tbit", input: Value{F: 1, U: "Pbit"}, toUnit: "Tbit", expected: Value{F: 1000, U: "Tbit"}},
		// Binary bit scaling
		{name: "Binary bit scaling: 1024 bit = 1 Kibit", input: Value{F: 1024, U: "bit"}, toUnit: "Kibit", expected: Value{F: 1, U: "Kibit"}},
		{name: "Kibibit to bits: 1 Kibit = 1024 bit", input: Value{F: 1, U: "Kibit"}, toUnit: "bit", expected: Value{F: 1024, U: "bit"}},
		{name: "Binary bit scaling: 1024 Kibit = 1 Mibit", input: Value{F: 1024, U: "Kibit"}, toUnit: "Mibit", expected: Value{F: 1, U: "Mibit"}},
		{name: "Mebibit to kibibit: 1 Mibit = 1024 Kibit", input: Value{F: 1, U: "Mibit"}, toUnit: "Kibit", expected: Value{F: 1024, U: "Kibit"}},
		{name: "Binary bit scaling: 1024 Mibit = 1 Gibit", input: Value{F: 1024, U: "Mibit"}, toUnit: "Gibit", expected: Value{F: 1, U: "Gibit"}},
		{name: "Gibibit to mebibit: 1 Gibit = 1024 Mibit", input: Value{F: 1, U: "Gibit"}, toUnit: "Mibit", expected: Value{F: 1024, U: "Mibit"}},
		{name: "Binary bit scaling: 1024 Gibit = 1 Tibit", input: Value{F: 1024, U: "Gibit"}, toUnit: "Tibit", expected: Value{F: 1, U: "Tibit"}},
		{name: "Tebibit to gibibit: 1 Tibit = 1024 Gibit", input: Value{F: 1, U: "Tibit"}, toUnit: "Gibit", expected: Value{F: 1024, U: "Gibit"}},
		{name: "Binary bit scaling: 1024 Tibit = 1 Pibit", input: Value{F: 1024, U: "Tibit"}, toUnit: "Pibit", expected: Value{F: 1, U: "Pibit"}},
		{name: "Pebibit to tebibit: 1 Pibit = 1024 Tibit", input: Value{F: 1, U: "Pibit"}, toUnit: "Tibit", expected: Value{F: 1024, U: "Tibit"}},
		// Bytes to bits
		{name: "Bytes to bits: 1 KiBy = 8 Kibit", input: Value{F: 1, U: "KiBy"}, toUnit: "Kibit", expected: Value{F: 8, U: "Kibit"}},
		{name: "Bytes to bits: 1 MiBy = 8 Mibit", input: Value{F: 1, U: "MiBy"}, toUnit: "Mibit", expected: Value{F: 8, U: "Mibit"}},
		{name: "Bytes to bits: 1 GiBy = 8 Gibit", input: Value{F: 1, U: "GiBy"}, toUnit: "Gibit", expected: Value{F: 8, U: "Gibit"}},
		// SI byte scaling (Exa, Zetta, Yotta)
		{name: "SI byte scaling: 1000 PBy = 1 EBy", input: Value{F: 1000, U: "PBy"}, toUnit: "EBy", expected: Value{F: 1, U: "EBy"}},
		{name: "Exabyte to bytes: 1 EBy = 1e18 By", input: Value{F: 1, U: "EBy"}, toUnit: "By", expected: Value{F: 1e18, U: "By"}},
		{name: "SI byte scaling: 1000 EBy = 1 ZBy", input: Value{F: 1000, U: "EBy"}, toUnit: "ZBy", expected: Value{F: 1, U: "ZBy"}},
		{name: "Zettabyte to petabytes: 1 ZBy = 1000000 PBy", input: Value{F: 1, U: "ZBy"}, toUnit: "PBy", expected: Value{F: 1e6, U: "PBy"}},
		{name: "SI byte scaling: 1000 ZBy = 1 YBy", input: Value{F: 1000, U: "ZBy"}, toUnit: "YBy", expected: Value{F: 1, U: "YBy"}},
		{name: "Yottabyte to zettabyte: 1 YBy = 1000 ZBy", input: Value{F: 1, U: "YBy"}, toUnit: "ZBy", expected: Value{F: 1000, U: "ZBy"}},
		// Binary byte scaling (Exbi, Zebi, Yobi)
		{name: "Binary byte scaling: 1024 PiBy = 1 EiBy", input: Value{F: 1024, U: "PiBy"}, toUnit: "EiBy", expected: Value{F: 1, U: "EiBy"}},
		{name: "Exbibyte to tebibytes: 1 EiBy = 1048576 TiBy", input: Value{F: 1, U: "EiBy"}, toUnit: "TiBy", expected: Value{F: 1024 * 1024, U: "TiBy"}},
		{name: "Binary byte scaling: 1024 EiBy = 1 ZiBy", input: Value{F: 1024, U: "EiBy"}, toUnit: "ZiBy", expected: Value{F: 1, U: "ZiBy"}},
		{name: "Zebibyte to exbibyte: 1 ZiBy = 1024 EiBy", input: Value{F: 1, U: "ZiBy"}, toUnit: "EiBy", expected: Value{F: 1024, U: "EiBy"}},
		{name: "Binary byte scaling: 1024 ZiBy = 1 YiBy", input: Value{F: 1024, U: "ZiBy"}, toUnit: "YiBy", expected: Value{F: 1, U: "YiBy"}},
		{name: "Yobibyte to zebibyte: 1 YiBy = 1024 ZiBy", input: Value{F: 1, U: "YiBy"}, toUnit: "ZiBy", expected: Value{F: 1024, U: "ZiBy"}},
		// SI bit scaling (Exa, Zetta, Yotta)
		{name: "SI bit scaling: 1000 Pbit = 1 Ebit", input: Value{F: 1000, U: "Pbit"}, toUnit: "Ebit", expected: Value{F: 1, U: "Ebit"}},
		{name: "Exabit to gigabits: 1 Ebit = 1e9 Gbit", input: Value{F: 1, U: "Ebit"}, toUnit: "Gbit", expected: Value{F: 1e9, U: "Gbit"}},
		{name: "SI bit scaling: 1000 Ebit = 1 Zbit", input: Value{F: 1000, U: "Ebit"}, toUnit: "Zbit", expected: Value{F: 1, U: "Zbit"}},
		{name: "Zettabit to exabit: 1 Zbit = 1000 Ebit", input: Value{F: 1, U: "Zbit"}, toUnit: "Ebit", expected: Value{F: 1000, U: "Ebit"}},
		{name: "SI bit scaling: 1000 Zbit = 1 Ybit", input: Value{F: 1000, U: "Zbit"}, toUnit: "Ybit", expected: Value{F: 1, U: "Ybit"}},
		{name: "Yottabit to zettabit: 1 Ybit = 1000 Zbit", input: Value{F: 1, U: "Ybit"}, toUnit: "Zbit", expected: Value{F: 1000, U: "Zbit"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := dataConverter.Convert(tt.input, tt.toUnit)
			assert.Equal(t, tt.expected, got)
		})
	}
}

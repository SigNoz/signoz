package converter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDataRate(t *testing.T) {
	dataRateConverter := NewDataRateConverter()
	// names and ids for data rate units
	// { name: 'bytes/sec(IEC)', id: 'binBps' },
	// { name: 'bytes/sec(SI)', id: 'Bps' },
	// { name: 'bits/sec(IEC)', id: 'binbps' },
	// { name: 'bits/sec(SI)', id: 'bps' },
	// { name: 'kibibytes/sec', id: 'KiBs' },
	// { name: 'kibibits/sec', id: 'Kibits' },
	// { name: 'kilobytes/sec', id: 'KBs' },
	// { name: 'kilobits/sec', id: 'Kbits' },
	// { name: 'mebibytes/sec', id: 'MiBs' },
	// { name: 'mebibits/sec', id: 'Mibits' },
	// { name: 'megabytes/sec', id: 'MBs' },
	// { name: 'megabits/sec', id: 'Mbits' },
	// { name: 'gibibytes/sec', id: 'GiBs' },
	// { name: 'gibibits/sec', id: 'Gibits' },
	// { name: 'gigabytes/sec', id: 'GBs' },
	// { name: 'gigabits/sec', id: 'Gbits' },
	// { name: 'tebibytes/sec', id: 'TiBs' },
	// { name: 'tebibits/sec', id: 'Tibits' },
	// { name: 'terabytes/sec', id: 'TBs' },
	// { name: 'terabits/sec', id: 'Tbits' },
	// { name: 'pebibytes/sec', id: 'PiBs' },
	// { name: 'pebibits/sec', id: 'Pibits' },
	// { name: 'petabytes/sec', id: 'PBs' },
	// { name: 'petabits/sec', id: 'Pbits' },

	// 8 bits = 1 byte
	assert.Equal(t, Value{F: 1, U: "binBps"}, dataRateConverter.Convert(Value{F: 8, U: "binbps"}, "binBps"))
	// 8 bits = 1 byte
	assert.Equal(t, Value{F: 1, U: "Bps"}, dataRateConverter.Convert(Value{F: 8, U: "bps"}, "Bps"))
	// 8 bits = 1 byte
	assert.Equal(t, Value{F: 1, U: "By/s"}, dataRateConverter.Convert(Value{F: 8, U: "bit/s"}, "By/s"))
	// 1024 bytes = 1 kbytes
	assert.Equal(t, Value{F: 1, U: "KiBs"}, dataRateConverter.Convert(Value{F: 1024, U: "binBps"}, "KiBs"))
	// 1 byte = 8 bits
	assert.Equal(t, Value{F: 8, U: "binbps"}, dataRateConverter.Convert(Value{F: 1, U: "binBps"}, "binbps"))
	// 1 byte = 8 bits
	assert.Equal(t, Value{F: 8, U: "bit/s"}, dataRateConverter.Convert(Value{F: 1, U: "Bps"}, "bit/s"))
	// 1 mbytes = 1024 kbytes
	assert.Equal(t, Value{F: 1, U: "MiBs"}, dataRateConverter.Convert(Value{F: 1024, U: "KiBs"}, "MiBs"))
	// 1 kbytes = 1024 bytes
	assert.Equal(t, Value{F: 1024, U: "binBps"}, dataRateConverter.Convert(Value{F: 1, U: "KiBs"}, "binBps"))
	// 1024 kbytes = 1 mbytes
	assert.Equal(t, Value{F: 1, U: "MiBs"}, dataRateConverter.Convert(Value{F: 1024, U: "KiBs"}, "MiBs"))
	// 1 mbytes = 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "binBps"}, dataRateConverter.Convert(Value{F: 1, U: "MiBs"}, "binBps"))
	// 1024 mbytes = 1 gbytes
	assert.Equal(t, Value{F: 1, U: "GiBs"}, dataRateConverter.Convert(Value{F: 1024, U: "MiBs"}, "GiBs"))
	// 2048 mbytes = 2 gbytes
	assert.Equal(t, Value{F: 2, U: "GiBs"}, dataRateConverter.Convert(Value{F: 2048, U: "MiBs"}, "GiBs"))
	// 1 gbytes = 1024 mbytes
	assert.Equal(t, Value{F: 1024, U: "MiBs"}, dataRateConverter.Convert(Value{F: 1, U: "GiBs"}, "MiBs"))
	// 1 gbytes = 1024 * 1024 kbytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "KiBs"}, dataRateConverter.Convert(Value{F: 1, U: "GiBs"}, "KiBs"))
	// 1 gbytes = 1024 * 1024 * 1024 bytes
	assert.Equal(t, Value{F: (1024 * 1024 * 1024 * 8) / 1024, U: "Kibits"}, dataRateConverter.Convert(Value{F: 1, U: "GiBs"}, "Kibits"))
	// 1 gbytes = 1024 * 1024 * 1024 bytes
	assert.Equal(t, Value{F: float64(1024*1024*1024) / 1000.0, U: "kBy/s"}, dataRateConverter.Convert(Value{F: 1, U: "GiBs"}, "kBy/s"))
	// 1 gbytes = 1024 * 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024 * 1024, U: "binBps"}, dataRateConverter.Convert(Value{F: 1, U: "GiBs"}, "binBps"))
	// 1024 * 1024 bytes = 1 mbytes
	assert.Equal(t, Value{F: 1, U: "MiBs"}, dataRateConverter.Convert(Value{F: 1024 * 1024, U: "binBps"}, "MiBs"))
	// 1024 * 1024 kbytes = 1 gbytes
	assert.Equal(t, Value{F: 1, U: "GiBs"}, dataRateConverter.Convert(Value{F: 1024 * 1024, U: "KiBs"}, "GiBs"))
	// 1024 * 1024 * 1024 bytes = 1 gbytes
	assert.Equal(t, Value{F: 1, U: "GiBs"}, dataRateConverter.Convert(Value{F: 1024 * 1024 * 1024, U: "binBps"}, "GiBs"))
}

func TestDataRateConversionUCUMUnit(t *testing.T) {
	dataRateConverter := NewDataRateConverter()

	tests := []struct {
		name     string
		input    Value
		toUnit   Unit
		expected Value
	}{
		// Binary byte scaling
		{name: "Binary byte scaling: 1024 By/s = 1 KiBy/s", input: Value{F: 1024, U: "By/s"}, toUnit: "KiBy/s", expected: Value{F: 1, U: "KiBy/s"}},
		{name: "Kibibyte to bytes: 1 KiBy/s = 1024 By/s", input: Value{F: 1, U: "KiBy/s"}, toUnit: "By/s", expected: Value{F: 1024, U: "By/s"}},
		{name: "Binary byte scaling: 1024 KiBy/s = 1 MiBy/s", input: Value{F: 1024, U: "KiBy/s"}, toUnit: "MiBy/s", expected: Value{F: 1, U: "MiBy/s"}},
		{name: "Gibibyte to bytes: 1 GiBy/s = 1073741824 By/s", input: Value{F: 1, U: "GiBy/s"}, toUnit: "By/s", expected: Value{F: 1024 * 1024 * 1024, U: "By/s"}},
		{name: "Binary byte scaling: 1024 MiBy/s = 1 GiBy/s", input: Value{F: 1024, U: "MiBy/s"}, toUnit: "GiBy/s", expected: Value{F: 1, U: "GiBy/s"}},
		{name: "Gibibyte to mebibyte: 1 GiBy/s = 1024 MiBy/s", input: Value{F: 1, U: "GiBy/s"}, toUnit: "MiBy/s", expected: Value{F: 1024, U: "MiBy/s"}},
		{name: "Binary byte scaling: 1024 GiBy/s = 1 TiBy/s", input: Value{F: 1024, U: "GiBy/s"}, toUnit: "TiBy/s", expected: Value{F: 1, U: "TiBy/s"}},
		{name: "Tebibyte to bytes: 1 TiBy/s = 1099511627776 By/s", input: Value{F: 1, U: "TiBy/s"}, toUnit: "By/s", expected: Value{F: 1024 * 1024 * 1024 * 1024, U: "By/s"}},
		{name: "Binary byte scaling: 1024 TiBy/s = 1 PiBy/s", input: Value{F: 1024, U: "TiBy/s"}, toUnit: "PiBy/s", expected: Value{F: 1, U: "PiBy/s"}},
		{name: "Pebibyte to tebibyte: 1 PiBy/s = 1024 TiBy/s", input: Value{F: 1, U: "PiBy/s"}, toUnit: "TiBy/s", expected: Value{F: 1024, U: "TiBy/s"}},
		// Binary bit scaling
		{name: "Binary bit scaling: 1024 bit/s = 1 Kibit/s", input: Value{F: 1024, U: "bit/s"}, toUnit: "Kibit/s", expected: Value{F: 1, U: "Kibit/s"}},
		{name: "Kibibit to bits: 1 Kibit/s = 1024 bit/s", input: Value{F: 1, U: "Kibit/s"}, toUnit: "bit/s", expected: Value{F: 1024, U: "bit/s"}},
		{name: "Binary bit scaling: 1024 Kibit/s = 1 Mibit/s", input: Value{F: 1024, U: "Kibit/s"}, toUnit: "Mibit/s", expected: Value{F: 1, U: "Mibit/s"}},
		{name: "Gibibit to bits: 1 Gibit/s = 1073741824 bit/s", input: Value{F: 1, U: "Gibit/s"}, toUnit: "bit/s", expected: Value{F: 1024 * 1024 * 1024, U: "bit/s"}},
		{name: "Binary bit scaling: 1024 Mibit/s = 1 Gibit/s", input: Value{F: 1024, U: "Mibit/s"}, toUnit: "Gibit/s", expected: Value{F: 1, U: "Gibit/s"}},
		{name: "Gibibit to mebibit: 1 Gibit/s = 1024 Mibit/s", input: Value{F: 1, U: "Gibit/s"}, toUnit: "Mibit/s", expected: Value{F: 1024, U: "Mibit/s"}},
		{name: "Binary bit scaling: 1024 Gibit/s = 1 Tibit/s", input: Value{F: 1024, U: "Gibit/s"}, toUnit: "Tibit/s", expected: Value{F: 1, U: "Tibit/s"}},
		{name: "Tebibit to gibibit: 1 Tibit/s = 1024 Gibit/s", input: Value{F: 1, U: "Tibit/s"}, toUnit: "Gibit/s", expected: Value{F: 1024, U: "Gibit/s"}},
		{name: "Binary bit scaling: 1024 Tibit/s = 1 Pibit/s", input: Value{F: 1024, U: "Tibit/s"}, toUnit: "Pibit/s", expected: Value{F: 1, U: "Pibit/s"}},
		{name: "Pebibit to tebibit: 1 Pibit/s = 1024 Tibit/s", input: Value{F: 1, U: "Pibit/s"}, toUnit: "Tibit/s", expected: Value{F: 1024, U: "Tibit/s"}},
		// Bytes to bits
		{name: "Bytes to bits: 1 KiBy/s = 8 Kibit/s", input: Value{F: 1, U: "KiBy/s"}, toUnit: "Kibit/s", expected: Value{F: 8, U: "Kibit/s"}},
		{name: "Bytes to bits: 1 MiBy/s = 8 Mibit/s", input: Value{F: 1, U: "MiBy/s"}, toUnit: "Mibit/s", expected: Value{F: 8, U: "Mibit/s"}},
		{name: "Bytes to bits: 1 GiBy/s = 8 Gibit/s", input: Value{F: 1, U: "GiBy/s"}, toUnit: "Gibit/s", expected: Value{F: 8, U: "Gibit/s"}},
		// Unit alias
		{name: "Unit alias: 1 KiBs = 1 KiBy/s", input: Value{F: 1, U: "KiBs"}, toUnit: "KiBy/s", expected: Value{F: 1, U: "KiBy/s"}},
		{name: "Unit alias: 1 Kibits = 1 Kibit/s", input: Value{F: 1, U: "Kibits"}, toUnit: "Kibit/s", expected: Value{F: 1, U: "Kibit/s"}},
		// SI byte scaling (Exa, Zetta, Yotta)
		{name: "SI byte scaling: 1000 PBy/s = 1 EBy/s", input: Value{F: 1000, U: "PBy/s"}, toUnit: "EBy/s", expected: Value{F: 1, U: "EBy/s"}},
		{name: "Exabyte to bytes: 1 EBy/s = 1e18 By/s", input: Value{F: 1, U: "EBy/s"}, toUnit: "By/s", expected: Value{F: 1e18, U: "By/s"}},
		{name: "SI byte scaling: 1000 EBy/s = 1 ZBy/s", input: Value{F: 1000, U: "EBy/s"}, toUnit: "ZBy/s", expected: Value{F: 1, U: "ZBy/s"}},
		{name: "Zettabyte to petabytes: 1 ZBy/s = 1000000 PBy/s", input: Value{F: 1, U: "ZBy/s"}, toUnit: "PBy/s", expected: Value{F: 1e6, U: "PBy/s"}},
		{name: "SI byte scaling: 1000 ZBy/s = 1 YBy/s", input: Value{F: 1000, U: "ZBy/s"}, toUnit: "YBy/s", expected: Value{F: 1, U: "YBy/s"}},
		{name: "Yottabyte to zettabyte: 1 YBy/s = 1000 ZBy/s", input: Value{F: 1, U: "YBy/s"}, toUnit: "ZBy/s", expected: Value{F: 1000, U: "ZBy/s"}},
		// Binary byte scaling (Exbi, Zebi, Yobi)
		{name: "Binary byte scaling: 1024 PiBy/s = 1 EiBy/s", input: Value{F: 1024, U: "PiBy/s"}, toUnit: "EiBy/s", expected: Value{F: 1, U: "EiBy/s"}},
		{name: "Exbibyte to tebibytes: 1 EiBy/s = 1048576 TiBy/s", input: Value{F: 1, U: "EiBy/s"}, toUnit: "TiBy/s", expected: Value{F: 1024 * 1024, U: "TiBy/s"}},
		{name: "Binary byte scaling: 1024 EiBy/s = 1 ZiBy/s", input: Value{F: 1024, U: "EiBy/s"}, toUnit: "ZiBy/s", expected: Value{F: 1, U: "ZiBy/s"}},
		{name: "Zebibyte to exbibyte: 1 ZiBy/s = 1024 EiBy/s", input: Value{F: 1, U: "ZiBy/s"}, toUnit: "EiBy/s", expected: Value{F: 1024, U: "EiBy/s"}},
		{name: "Binary byte scaling: 1024 ZiBy/s = 1 YiBy/s", input: Value{F: 1024, U: "ZiBy/s"}, toUnit: "YiBy/s", expected: Value{F: 1, U: "YiBy/s"}},
		{name: "Yobibyte to zebibyte: 1 YiBy/s = 1024 ZiBy/s", input: Value{F: 1, U: "YiBy/s"}, toUnit: "ZiBy/s", expected: Value{F: 1024, U: "ZiBy/s"}},
		// SI bit scaling (Exa, Zetta, Yotta)
		{name: "SI bit scaling: 1000 Pbit/s = 1 Ebit/s", input: Value{F: 1000, U: "Pbit/s"}, toUnit: "Ebit/s", expected: Value{F: 1, U: "Ebit/s"}},
		{name: "Exabit to gigabits: 1 Ebit/s = 1e9 Gbit/s", input: Value{F: 1, U: "Ebit/s"}, toUnit: "Gbit/s", expected: Value{F: 1e9, U: "Gbit/s"}},
		{name: "SI bit scaling: 1000 Ebit/s = 1 Zbit/s", input: Value{F: 1000, U: "Ebit/s"}, toUnit: "Zbit/s", expected: Value{F: 1, U: "Zbit/s"}},
		{name: "Zettabit to exabit: 1 Zbit/s = 1000 Ebit/s", input: Value{F: 1, U: "Zbit/s"}, toUnit: "Ebit/s", expected: Value{F: 1000, U: "Ebit/s"}},
		{name: "SI bit scaling: 1000 Zbit/s = 1 Ybit/s", input: Value{F: 1000, U: "Zbit/s"}, toUnit: "Ybit/s", expected: Value{F: 1, U: "Ybit/s"}},
		{name: "Yottabit to zettabit: 1 Ybit/s = 1000 Zbit/s", input: Value{F: 1, U: "Ybit/s"}, toUnit: "Zbit/s", expected: Value{F: 1000, U: "Zbit/s"}},
		// Binary bit scaling (Exbi, Zebi, Yobi)
		{name: "Binary bit scaling: 1024 Pibit/s = 1 Eibit/s", input: Value{F: 1024, U: "Pibit/s"}, toUnit: "Eibit/s", expected: Value{F: 1, U: "Eibit/s"}},
		{name: "Exbibit to pebibit: 1 Eibit/s = 1024 Pibit/s", input: Value{F: 1, U: "Eibit/s"}, toUnit: "Pibit/s", expected: Value{F: 1024, U: "Pibit/s"}},
		{name: "Binary bit scaling: 1024 Eibit/s = 1 Zibit/s", input: Value{F: 1024, U: "Eibit/s"}, toUnit: "Zibit/s", expected: Value{F: 1, U: "Zibit/s"}},
		{name: "Zebibit to exbibit: 1 Zibit/s = 1024 Eibit/s", input: Value{F: 1, U: "Zibit/s"}, toUnit: "Eibit/s", expected: Value{F: 1024, U: "Eibit/s"}},
		{name: "Binary bit scaling: 1024 Zibit/s = 1 Yibit/s", input: Value{F: 1024, U: "Zibit/s"}, toUnit: "Yibit/s", expected: Value{F: 1, U: "Yibit/s"}},
		{name: "Yobibit to zebibit: 1 Yibit/s = 1024 Zibit/s", input: Value{F: 1, U: "Yibit/s"}, toUnit: "Zibit/s", expected: Value{F: 1024, U: "Zibit/s"}},
		// Bytes to bits (Exbi, Zebi, Yobi)
		{name: "Bytes to bits: 1 EiBy/s = 8 Eibit/s", input: Value{F: 1, U: "EiBy/s"}, toUnit: "Eibit/s", expected: Value{F: 8, U: "Eibit/s"}},
		{name: "Bytes to bits: 1 ZiBy/s = 8 Zibit/s", input: Value{F: 1, U: "ZiBy/s"}, toUnit: "Zibit/s", expected: Value{F: 8, U: "Zibit/s"}},
		{name: "Bytes to bits: 1 YiBy/s = 8 Yibit/s", input: Value{F: 1, U: "YiBy/s"}, toUnit: "Yibit/s", expected: Value{F: 8, U: "Yibit/s"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := dataRateConverter.Convert(tt.input, tt.toUnit)
			assert.Equal(t, tt.expected, got)
		})
	}
}

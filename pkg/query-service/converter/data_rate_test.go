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
	// 1024 bytes = 1 kbytes
	assert.Equal(t, Value{F: 1, U: "KiBs"}, dataRateConverter.Convert(Value{F: 1024, U: "binBps"}, "KiBs"))
	// 1 byte = 8 bits
	assert.Equal(t, Value{F: 8, U: "binbps"}, dataRateConverter.Convert(Value{F: 1, U: "binBps"}, "binbps"))
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
	assert.Equal(t, Value{F: 1024 * 1024 * 1024, U: "binBps"}, dataRateConverter.Convert(Value{F: 1, U: "GiBs"}, "binBps"))
	// 1024 * 1024 bytes = 1 mbytes
	assert.Equal(t, Value{F: 1, U: "MiBs"}, dataRateConverter.Convert(Value{F: 1024 * 1024, U: "binBps"}, "MiBs"))
	// 1024 * 1024 kbytes = 1 gbytes
	assert.Equal(t, Value{F: 1, U: "GiBs"}, dataRateConverter.Convert(Value{F: 1024 * 1024, U: "KiBs"}, "GiBs"))
	// 1024 * 1024 * 1024 bytes = 1 gbytes
	assert.Equal(t, Value{F: 1, U: "GiBs"}, dataRateConverter.Convert(Value{F: 1024 * 1024 * 1024, U: "binBps"}, "GiBs"))
}

package formatter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestData(t *testing.T) {
	dataFormatter := NewDataFormatter()

	assert.Equal(t, "1 B", dataFormatter.Format(1, "bytes"))
	assert.Equal(t, "1 B", dataFormatter.Format(1, "By"))
	assert.Equal(t, "1.0 KiB", dataFormatter.Format(1024, "bytes"))
	assert.Equal(t, "1.0 KiB", dataFormatter.Format(1024, "By"))
	assert.Equal(t, "2.3 GiB", dataFormatter.Format(2.3*1024, "mbytes"))
	assert.Equal(t, "2.3 GiB", dataFormatter.Format(2.3*1024, "MiBy"))
	assert.Equal(t, "1.0 MiB", dataFormatter.Format(1024*1024, "bytes"))
	assert.Equal(t, "1.0 MiB", dataFormatter.Format(1024*1024, "By"))
	assert.Equal(t, "69 TiB", dataFormatter.Format(69*1024*1024, "mbytes"))
	assert.Equal(t, "69 TiB", dataFormatter.Format(69*1024*1024, "MiBy"))
	assert.Equal(t, "102 KiB", dataFormatter.Format(102*1024, "bytes"))
	assert.Equal(t, "102 KiB", dataFormatter.Format(102*1024, "By"))
	assert.Equal(t, "240 MiB", dataFormatter.Format(240*1024, "kbytes"))
	assert.Equal(t, "240 MiB", dataFormatter.Format(240*1024, "KiBy"))
	assert.Equal(t, "1.0 GiB", dataFormatter.Format(1024*1024, "kbytes"))
	assert.Equal(t, "1.0 GiB", dataFormatter.Format(1024*1024, "KiBy"))
	assert.Equal(t, "23 GiB", dataFormatter.Format(23*1024*1024, "kbytes"))
	assert.Equal(t, "23 GiB", dataFormatter.Format(23*1024*1024, "KiBy"))
	assert.Equal(t, "32 TiB", dataFormatter.Format(32*1024*1024*1024, "kbytes"))
	assert.Equal(t, "32 TiB", dataFormatter.Format(32*1024*1024*1024, "KiBy"))
	assert.Equal(t, "24 MiB", dataFormatter.Format(24, "mbytes"))
	assert.Equal(t, "24 MiB", dataFormatter.Format(24, "MiBy"))
}

func TestDataFormatterComprehensive(t *testing.T) {
	dataFormatter := NewDataFormatter()

	tests := []struct {
		name     string
		value    float64
		unit     string
		expected string
	}{
		// IEC Bits - bits, bit
		{name: "bits: 1", value: 1, unit: "bits", expected: "1 b"},
		{name: "bits: 7", value: 7, unit: "bit", expected: "7 b"},
		{name: "bits: to MiB = 8 * 1024 * 1024 * 9", value: 8 * 1024 * 1024 * 9, unit: "bits", expected: "9.0 MiB"},

		// SI Bits - decbits, bit
		{name: "decbits: 1", value: 1, unit: "decbits", expected: "1 b"},
		{name: "decbits: 7", value: 7, unit: "decbits", expected: "7 b"},
		{name: "decbits: to MB = 8 * 1000 * 1000 * 4", value: 8 * 1000 * 1000 * 4, unit: "decbits", expected: "4.0 MB"},

		// IEC Base bytes - bytes, By
		{name: "bytes: 0", value: 0, unit: "bytes", expected: "0 B"},
		{name: "bytes: 1", value: 1, unit: "bytes", expected: "1 B"},
		{name: "bytes: 512", value: 512, unit: "bytes", expected: "512 B"},
		{name: "bytes: 1023", value: 1023, unit: "bytes", expected: "1023 B"},
		{name: "bytes: 1024 = 1 KiB", value: 1024, unit: "bytes", expected: "1.0 KiB"},
		{name: "bytes: 1536", value: 1536, unit: "bytes", expected: "1.5 KiB"},
		{name: "bytes: 1024*1024 = 1 MiB", value: 1024 * 1024, unit: "bytes", expected: "1.0 MiB"},
		{name: "bytes: 1024*1024*1024 = 1 GiB", value: 1024 * 1024 * 1024, unit: "bytes", expected: "1.0 GiB"},
		{name: "By: same as bytes", value: 1024, unit: "By", expected: "1.0 KiB"},

		// SI Base bytes - decbytes
		{name: "decbytes: 1", value: 1, unit: "decbytes", expected: "1 B"},
		{name: "decbytes: 1000 = 1 kB", value: 1000, unit: "decbytes", expected: "1.0 kB"},
		{name: "decbytes: 1000*1000 = 1 MB", value: 1000 * 1000, unit: "decbytes", expected: "1.0 MB"},
		{name: "decbytes: 1000*1000*1000 = 1 GB", value: 1000 * 1000 * 1000, unit: "decbytes", expected: "1.0 GB"},

		// Kibibytes - kbytes, KiBy (IEC)
		{name: "kbytes: 0", value: 0, unit: "kbytes", expected: "0 B"},
		{name: "kbytes: 1 = 1 KiB", value: 1, unit: "kbytes", expected: "1.0 KiB"},
		{name: "kbytes: 512", value: 512, unit: "kbytes", expected: "512 KiB"},
		{name: "kbytes: 1024 = 1 MiB", value: 1024, unit: "kbytes", expected: "1.0 MiB"},
		{name: "kbytes: 1024*1024 = 1 GiB", value: 1024 * 1024, unit: "kbytes", expected: "1.0 GiB"},
		{name: "kbytes: 2.3*1024 = 2.3 MiB", value: 2.3 * 1024, unit: "kbytes", expected: "2.3 MiB"},
		{name: "KiBy: 1 = 1 KiB", value: 1, unit: "KiBy", expected: "1.0 KiB"},
		{name: "KiBy: 1024 = 1 MiB", value: 1024, unit: "KiBy", expected: "1.0 MiB"},
		{name: "kbytes and KiBy alias", value: 240 * 1024, unit: "KiBy", expected: "240 MiB"},

		// SI Kilobytes - decKbytes, deckbytes, kBy
		{name: "decKbytes: 1 = 1 kB", value: 1, unit: "decKbytes", expected: "1.0 kB"},
		{name: "decKbytes: 1000 = 1 MB", value: 1000, unit: "decKbytes", expected: "1.0 MB"},
		{name: "deckbytes: 1 = 1 kB", value: 1, unit: "deckbytes", expected: "1.0 kB"},
		{name: "kBy: 1 = 1 kB", value: 1, unit: "kBy", expected: "1.0 kB"},
		{name: "kBy: 1000 = 1 MB", value: 1000, unit: "kBy", expected: "1.0 MB"},

		// Mebibytes - mbytes, MiBy (IEC)
		{name: "mbytes: 1 = 1 MiB", value: 1, unit: "mbytes", expected: "1.0 MiB"},
		{name: "mbytes: 24", value: 24, unit: "mbytes", expected: "24 MiB"},
		{name: "mbytes: 1024 = 1 GiB", value: 1024, unit: "mbytes", expected: "1.0 GiB"},
		{name: "mbytes: 1024*1024 = 1 TiB", value: 1024 * 1024, unit: "mbytes", expected: "1.0 TiB"},
		{name: "mbytes: 69*1024 = 69 GiB", value: 69 * 1024, unit: "mbytes", expected: "69 GiB"},
		{name: "mbytes: 69*1024*1024 = 69 TiB", value: 69 * 1024 * 1024, unit: "mbytes", expected: "69 TiB"},
		{name: "MiBy: 1 = 1 MiB", value: 1, unit: "MiBy", expected: "1.0 MiB"},
		{name: "MiBy: 1024 = 1 GiB", value: 1024, unit: "MiBy", expected: "1.0 GiB"},

		// SI Megabytes - decMbytes, decmbytes, MBy
		{name: "decMbytes: 1 = 1 MB", value: 1, unit: "decMbytes", expected: "1.0 MB"},
		{name: "decMbytes: 1000 = 1 GB", value: 1000, unit: "decMbytes", expected: "1.0 GB"},
		{name: "decmbytes: 1 = 1 MB", value: 1, unit: "decmbytes", expected: "1.0 MB"},
		{name: "MBy: 1 = 1 MB", value: 1, unit: "MBy", expected: "1.0 MB"},

		// Gibibytes - gbytes, GiBy (IEC)
		{name: "gbytes: 1 = 1 GiB", value: 1, unit: "gbytes", expected: "1.0 GiB"},
		{name: "gbytes: 1024 = 1 TiB", value: 1024, unit: "gbytes", expected: "1.0 TiB"},
		{name: "GiBy: 42*1024 = 42 TiB", value: 42 * 1024, unit: "GiBy", expected: "42 TiB"},

		// SI Gigabytes - decGbytes, decgbytes, GBy
		{name: "decGbytes: 42*1000 = 42 TB", value: 42 * 1000, unit: "decGbytes", expected: "42 TB"},
		{name: "GBy: 42*1000 = 42 TB", value: 42 * 1000, unit: "GBy", expected: "42 TB"},

		// Tebibytes - tbytes, TiBy (IEC)
		{name: "tbytes: 1 = 1 TiB", value: 1, unit: "tbytes", expected: "1.0 TiB"},
		{name: "tbytes: 1024 = 1 PiB", value: 1024, unit: "tbytes", expected: "1.0 PiB"},
		{name: "TiBy: 42*1024 = 42 PiB", value: 42 * 1024, unit: "TiBy", expected: "42 PiB"},

		// SI Terabytes - decTbytes, dectbytes, TBy
		{name: "decTbytes: 42*1000 = 42 PB", value: 42 * 1000, unit: "decTbytes", expected: "42 PB"},
		{name: "dectbytes: 42*1000 = 42 PB", value: 42 * 1000, unit: "dectbytes", expected: "42 PB"},
		{name: "TBy: 42*1000 = 42 PB", value: 42 * 1000, unit: "TBy", expected: "42 PB"},

		// Pebibytes - pbytes, PiBy (IEC)
		{name: "pbytes: 10*1024 = 10 EiB", value: 10 * 1024, unit: "pbytes", expected: "10 EiB"},
		{name: "PiBy: 10*1024 = 10 EiB", value: 10 * 1024, unit: "PiBy", expected: "10 EiB"},

		// SI Petabytes - decPbytes, decpbytes, PBy
		{name: "decPbytes: 42 = 42 PB", value: 42, unit: "decPbytes", expected: "42 PB"},
		{name: "decpbytes: 42 = 42 PB", value: 42, unit: "decpbytes", expected: "42 PB"},
		{name: "PBy: 42 = 42 PB", value: 42, unit: "PBy", expected: "42 PB"},

		// Exbibytes - EiBy (IEC)
		{name: "EiBy: 10 = 10 EiB", value: 10, unit: "EiBy", expected: "10 EiB"},

		// Exabytes - EBy (SI)
		{name: "EBy: 10 = 10 EB", value: 10, unit: "EBy", expected: "10 EB"},

		// Kibibits - Kibit (IEC): 1 Kibit = 1024 bits = 128 bytes
		{name: "Kibit: 1 = 128 B", value: 1, unit: "Kibit", expected: "128 B"},
		{name: "Kibit: 1024 = 128 KiB", value: 1024, unit: "Kibit", expected: "128 KiB"},

		// Mebibits - Mibit (IEC): 1 Mibit = 1024 Kibit = 128 KiB
		{name: "Mibit: 1 = 128 KiB", value: 1, unit: "Mibit", expected: "128 KiB"},
		{name: "Mibit: 1024 = 128 MiB", value: 1024, unit: "Mibit", expected: "128 MiB"},

		// Gibibits - Gibit (IEC): 1 Gibit = 1024 Mibit = 128 MiB
		{name: "Gibit: 1 = 128 MiB", value: 1, unit: "Gibit", expected: "128 MiB"},
		{name: "Gibit: 42*1024 = 5.3 TiB", value: 42 * 1024, unit: "Gibit", expected: "5.3 TiB"},

		// Tebibits - Tibit (IEC): 1 Tibit = 1024 Gibit = 128 GiB
		{name: "Tibit: 1 = 128 GiB", value: 1, unit: "Tibit", expected: "128 GiB"},
		{name: "Tibit: 42*1024 = 5.3 PiB", value: 42 * 1024, unit: "Tibit", expected: "5.3 PiB"},

		// Kilobits - kbit (SI): 1 kbit = 1000 bits = 125 bytes
		{name: "kbit: 1 = 125 B", value: 1, unit: "kbit", expected: "125 B"},
		{name: "kbit: 1000 = 125 kB", value: 1000, unit: "kbit", expected: "125 kB"},

		// Megabits - Mbit (SI): 1 Mbit = 1000 kbit = 125 kB
		{name: "Mbit: 1 = 125 kB", value: 1, unit: "Mbit", expected: "125 kB"},
		{name: "Mbit: 1000 = 125 MB", value: 1000, unit: "Mbit", expected: "125 MB"},

		// Gigabits - Gbit (SI): 1 Gbit = 1000 Mbit = 125 MB
		{name: "Gbit: 1 = 125 MB", value: 1, unit: "Gbit", expected: "125 MB"},
		{name: "Gbit: 42*1000 = 5.3 TB", value: 42 * 1000, unit: "Gbit", expected: "5.3 TB"},

		// Terabits - Tbit (SI): 1 Tbit = 1000 Gbit = 125 GB
		{name: "Tbit: 1 = 125 GB", value: 1, unit: "Tbit", expected: "125 GB"},
		{name: "Tbit: 42*1000 = 5.3 PB", value: 42 * 1000, unit: "Tbit", expected: "5.3 PB"},

		// Petabits - Pbit (SI): 1 Pbit = 1000 Tbit = 125 TB
		{name: "Pbit: 1 = 125 TB", value: 1, unit: "Pbit", expected: "125 TB"},
		{name: "Pbit: 42 = 5.3 PB", value: 42, unit: "Pbit", expected: "5.3 PB"},

		// Exabits - Ebit (SI): 1 Ebit = 1000 Pbit = 125 PB
		{name: "Ebit: 1 = 125 PB", value: 1, unit: "Ebit", expected: "125 PB"},
		{name: "Ebit: 10 = 1.3 EB", value: 10, unit: "Ebit", expected: "1.3 EB"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := dataFormatter.Format(tt.value, tt.unit)
			assert.Equal(t, tt.expected, got)
		})
	}
}

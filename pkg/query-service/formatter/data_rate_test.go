package formatter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDataRateFormatterComprehensive(t *testing.T) {
	dataRateFormatter := NewDataRateFormatter()

	tests := []struct {
		name     string
		value    float64
		unit     string
		expected string
	}{
		// IEC Bits/sec - binbps, bps
		{name: "binbps as Bps", value: 7, unit: "binbps", expected: "7 b/s"},
		{name: "100 binbps as 12 Bps", value: 100, unit: "binbps", expected: "12 B/s"},
		{name: "binbps as 23 GiBs", value: 8 * 1024 * 1024 * 1024 * 23, unit: "binbps", expected: "23 GiB/s"},

		// SI Bits/sec - bps, bit/s
		{name: "bps as Bps", value: 5, unit: "bps", expected: "5 b/s"},
		{name: "200 bitps as 25 Bps", value: 200, unit: "bit/s", expected: "25 B/s"},
		{name: "bitps as MBs", value: 8 * 1000 * 1000 * 7, unit: "bit/s", expected: "7.0 MB/s"},

		// IEC Base bytes/sec - binBps
		{name: "binBps as Bps", value: 0, unit: "binBps", expected: "0 B/s"},
		{name: "1 binBps as 1 Bps", value: 1, unit: "binBps", expected: "1 B/s"},
		{name: "binBps as Kibps", value: 1024, unit: "binBps", expected: "1.0 KiB/s"},
		{name: "binBps as Mibps", value: 1024 * 1024, unit: "binBps", expected: "1.0 MiB/s"},
		{name: "binBps as Gibps", value: 1024 * 1024 * 1024, unit: "binBps", expected: "1.0 GiB/s"},

		// SI Base bytes/sec - Bps, By/s
		{name: "Bps as Bps", value: 1, unit: "Bps", expected: "1 B/s"},
		{name: "Bps as kbps", value: 1000, unit: "Bps", expected: "1.0 kB/s"},
		{name: "Bps as Mbps", value: 1000 * 1000, unit: "Bps", expected: "1.0 MB/s"},
		{name: "Byps as kbps", value: 1000, unit: "By/s", expected: "1.0 kB/s"},

		// Kibibytes/sec - KiBs, KiBy/s
		{name: "Kibs as Bps", value: 0, unit: "KiBs", expected: "0 B/s"},
		{name: "Kibs as Kibps", value: 1, unit: "KiBs", expected: "1.0 KiB/s"},
		{name: "Kibs as Mibps", value: 1024, unit: "KiBs", expected: "1.0 MiB/s"},
		{name: "Kibs as Gibps", value: 3 * 1024 * 1024, unit: "KiBs", expected: "3.0 GiB/s"},
		{name: "KiByps as Kibps", value: 1, unit: "KiBy/s", expected: "1.0 KiB/s"},
		{name: "KiByps as Mibps", value: 1024, unit: "KiBy/s", expected: "1.0 MiB/s"},

		// Kibibits/sec - Kibits, Kibit/s
		{name: "Kibitps as Kibps", value: 1, unit: "Kibits", expected: "128 B/s"},
		{name: "Kibitps as Mibps", value: 42 * 1024, unit: "Kibits", expected: "5.3 MiB/s"},
		{name: "Kibitps as Kibps 10", value: 10, unit: "Kibit/s", expected: "1.3 KiB/s"},

		// Kilobytes/sec (SI) - KBs, kBy/s
		{name: "Kbs as Bps", value: 0.5, unit: "KBs", expected: "500 B/s"},
		{name: "Kbs as Mibps", value: 1048.6, unit: "KBs", expected: "1.0 MiB/s"},
		{name: "kByps as Bps", value: 1, unit: "kBy/s", expected: "1000 B/s"},

		// Kilobits/sec (SI) - Kbits, kbit/s
		{name: "Kbitps as Bps", value: 1, unit: "Kbits", expected: "125 B/s"},
		{name: "kbitps as Bps", value: 1, unit: "kbit/s", expected: "125 B/s"},

		// Mebibytes/sec - MiBs, MiBy/s
		{name: "Mibs as Mibps", value: 1, unit: "MiBs", expected: "1.0 MiB/s"},
		{name: "Mibs as Gibps", value: 1024, unit: "MiBs", expected: "1.0 GiB/s"},
		{name: "Mibs as Tibps", value: 1024 * 1024, unit: "MiBs", expected: "1.0 TiB/s"},
		{name: "MiByps as Mibps", value: 1, unit: "MiBy/s", expected: "1.0 MiB/s"},

		// Mebibits/sec - Mibits, Mibit/s
		{name: "Mibitps as Mibps", value: 40, unit: "Mibits", expected: "5.0 MiB/s"},
		{name: "Mibitps as Mibps per second variant", value: 10, unit: "Mibit/s", expected: "1.3 MiB/s"},

		// Megabytes/sec (SI) - MBs, MBy/s
		{name: "Mbs as Kibps", value: 1, unit: "MBs", expected: "977 KiB/s"},
		{name: "MByps as Kibps", value: 1, unit: "MBy/s", expected: "977 KiB/s"},

		// Megabits/sec (SI) - Mbits, Mbit/s
		{name: "Mbitps as Kibps", value: 1, unit: "Mbits", expected: "125 kB/s"},
		{name: "Mbitps as Kibps per second variant", value: 1, unit: "Mbit/s", expected: "125 kB/s"},

		// Gibibytes/sec - GiBs, GiBy/s
		{name: "Gibs as Gibps", value: 1, unit: "GiBs", expected: "1.0 GiB/s"},
		{name: "Gibs as Tibps", value: 1024, unit: "GiBs", expected: "1.0 TiB/s"},
		{name: "GiByps as Tibps", value: 42 * 1024, unit: "GiBy/s", expected: "42 TiB/s"},

		// Gibibits/sec - Gibits, Gibit/s
		{name: "Gibitps as Tibps", value: 42 * 1024, unit: "Gibits", expected: "5.3 TiB/s"},
		{name: "Gibitps as Tibps per second variant", value: 42 * 1024, unit: "Gibit/s", expected: "5.3 TiB/s"},

		// Gigabytes/sec (SI) - GBs, GBy/s
		{name: "Gbs as Tibps", value: 42 * 1000, unit: "GBs", expected: "38 TiB/s"},
		{name: "GByps as Tibps", value: 42 * 1000, unit: "GBy/s", expected: "38 TiB/s"},

		// Gigabits/sec (SI) - Gbits, Gbit/s
		{name: "Gbitps as Tibps", value: 42 * 1000, unit: "Gbits", expected: "5.3 TB/s"},
		{name: "Gbitps as Tibps per second variant", value: 42 * 1000, unit: "Gbit/s", expected: "5.3 TB/s"},

		// Tebibytes/sec - TiBs, TiBy/s
		{name: "Tibs as Tibps", value: 1, unit: "TiBs", expected: "1.0 TiB/s"},
		{name: "Tibs as Pibps", value: 1024, unit: "TiBs", expected: "1.0 PiB/s"},
		{name: "TiByps as Pibps", value: 42 * 1024, unit: "TiBy/s", expected: "42 PiB/s"},

		// Tebibits/sec - Tibits, Tibit/s
		{name: "Tibitps as Pibps", value: 42 * 1024, unit: "Tibits", expected: "5.3 PiB/s"},
		{name: "Tibitps as Pibps per second variant", value: 42 * 1024, unit: "Tibit/s", expected: "5.3 PiB/s"},

		// Terabytes/sec (SI) - TBs, TBy/s
		{name: "Tbs as Pibps", value: 42 * 1000, unit: "TBs", expected: "37 PiB/s"},
		{name: "TByps as Pibps", value: 42 * 1000, unit: "TBy/s", expected: "37 PiB/s"},

		// Terabits/sec (SI) - Tbits, Tbit/s
		{name: "Tbitps as Pibps", value: 42 * 1000, unit: "Tbits", expected: "5.3 PB/s"},
		{name: "Tbitps as Pibps per second variant", value: 42 * 1000, unit: "Tbit/s", expected: "5.3 PB/s"},

		// Pebibytes/sec - PiBs, PiBy/s
		{name: "Pibs as Eibps", value: 10 * 1024, unit: "PiBs", expected: "10 EiB/s"},
		{name: "PiByps as Eibps", value: 10 * 1024, unit: "PiBy/s", expected: "10 EiB/s"},

		// Pebibits/sec - Pibits, Pibit/s
		{name: "Pibitps as Eibps", value: 10 * 1024, unit: "Pibits", expected: "1.3 EiB/s"},
		{name: "Pibitps as Eibps per second variant", value: 10 * 1024, unit: "Pibit/s", expected: "1.3 EiB/s"},

		// Petabytes/sec (SI) - PBs, PBy/s
		{name: "Pbs as Pibps", value: 42, unit: "PBs", expected: "37 PiB/s"},
		{name: "PByps as Pibps", value: 42, unit: "PBy/s", expected: "37 PiB/s"},

		// Petabits/sec (SI) - Pbits, Pbit/s
		{name: "Pbitps as Pibps", value: 42, unit: "Pbits", expected: "5.3 PB/s"},
		{name: "Pbitps as Pibps per second variant", value: 42, unit: "Pbit/s", expected: "5.3 PB/s"},

		// Exabytes/sec (SI) - EBy/s
		{name: "EByps as Ebps", value: 10, unit: "EBy/s", expected: "10 EB/s"},

		// Exabits/sec (SI) - Ebit/s
		{name: "Ebitps as Ebps", value: 10, unit: "Ebit/s", expected: "1.3 EB/s"},

		// Exbibytes/sec (IEC) - EiBy/s
		{name: "EiByps as Eibps", value: 10, unit: "EiBy/s", expected: "10 EiB/s"},

		// Exbibits/sec (IEC) - Eibit/s
		{name: "Eibitps as Eibps", value: 10, unit: "Eibit/s", expected: "1.3 EiB/s"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := dataRateFormatter.Format(tt.value, tt.unit)
			assert.Equal(t, tt.expected, got)
		})
	}
}

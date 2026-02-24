package formatter

type Formatter interface {
	Format(value float64, unit string) string

	Name() string
}

var (
	DurationFormatter   = NewDurationFormatter()
	BoolFormatter       = NewBoolFormatter()
	PercentFormatter    = NewPercentFormatter()
	NoneFormatter       = NewNoneFormatter()
	DataFormatter       = NewDataFormatter()
	DataRateFormatter   = NewDataRateFormatter()
	ThroughputFormatter = NewThroughputFormatter()
)

func FromUnit(u string) Formatter {
	switch u {
	case "ns", "us", "µs", "ms", "s", "m", "h", "d", "min", "w", "wk":
		return DurationFormatter
	case "bytes", "decbytes", "bits", "bit", "decbits", "kbytes", "decKbytes", "deckbytes", "mbytes", "decMbytes", "decmbytes", "gbytes", "decGbytes", "decgbytes", "tbytes", "decTbytes", "dectbytes", "pbytes", "decPbytes", "decpbytes", "By", "kBy", "MBy", "GBy", "TBy", "PBy", "EBy", "KiBy", "MiBy", "GiBy", "TiBy", "PiBy", "EiBy", "kbit", "Mbit", "Gbit", "Tbit", "Pbit", "Ebit", "Kibit", "Mibit", "Gibit", "Tibit", "Pibit":
		return DataFormatter
	case "binBps", "Bps", "binbps", "bps", "KiBs", "Kibits", "KBs", "Kbits", "MiBs", "Mibits", "MBs", "Mbits", "GiBs", "Gibits", "GBs", "Gbits", "TiBs", "Tibits", "TBs", "Tbits", "PiBs", "Pibits", "PBs", "Pbits", "By/s", "kBy/s", "MBy/s", "GBy/s", "TBy/s", "PBy/s", "EBy/s", "bit/s", "kbit/s", "Mbit/s", "Gbit/s", "Tbit/s", "Pbit/s", "Ebit/s", "KiBy/s", "MiBy/s", "GiBy/s", "TiBy/s", "PiBy/s", "EiBy/s", "Kibit/s", "Mibit/s", "Gibit/s", "Tibit/s", "Pibit/s", "Eibit/s":
		return DataRateFormatter
	case "percent", "percentunit", "%":
		return PercentFormatter
	case "bool", "bool_yes_no", "bool_true_false", "bool_1_0":
		return BoolFormatter
	case "cps", "ops", "reqps", "rps", "wps", "iops", "cpm", "opm", "rpm", "wpm", "{count}/s", "{ops}/s", "{req}/s", "{read}/s", "{write}/s", "{iops}/s", "{count}/min", "{ops}/min", "{read}/min", "{write}/min":
		return ThroughputFormatter
	default:
		return NoneFormatter
	}
}

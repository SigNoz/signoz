package converter

// Unit represents a unit of measurement
type Unit string

// Value represents a value with a unit of measurement
type Value struct {
	F float64
	U Unit
}

// Converter converts values from one unit to another
type Converter interface {
	// Convert converts the given value to the given unit
	Convert(v Value, to Unit) Value

	// Name returns the name of the converter
	Name() string
}

// noneConverter is a converter that does not convert
type noneConverter struct{}

func (*noneConverter) Name() string {
	return "none"
}

func (c *noneConverter) Convert(v Value, to Unit) Value {
	return v
}

// Converters
var (
	DurationConverter   = NewDurationConverter()
	DataConverter       = NewDataConverter()
	DataRateConverter   = NewDataRateConverter()
	PercentConverter    = NewPercentConverter()
	BoolConverter       = NewBoolConverter()
	ThroughputConverter = NewThroughputConverter()
	NoneConverter       = &noneConverter{}
)

// FromUnit returns a converter for the given unit
func FromUnit(u Unit) Converter {
	switch u {
	case "ns", "us", "µs", "ms", "s", "m", "h", "d":
		return DurationConverter
	case "bytes", "decbytes", "bits", "decbits", "kbytes", "decKbytes", "deckbytes", "mbytes", "decMbytes", "decmbytes", "gbytes", "decGbytes", "decgbytes", "tbytes", "decTbytes", "dectbytes", "pbytes", "decPbytes", "decpbytes":
		return DataConverter
	case "binBps", "Bps", "binbps", "bps", "KiBs", "Kibits", "KBs", "Kbits", "MiBs", "Mibits", "MBs", "Mbits", "GiBs", "Gibits", "GBs", "Gbits", "TiBs", "Tibits", "TBs", "Tbits", "PiBs", "Pibits", "PBs", "Pbits":
		return DataRateConverter
	case "percent", "percentunit":
		return PercentConverter
	case "bool", "bool_yes_no", "bool_true_false", "bool_1_0":
		return BoolConverter
	case "cps", "ops", "reqps", "rps", "wps", "iops", "cpm", "opm", "rpm", "wpm":
		return ThroughputConverter
	default:
		return NoneConverter
	}
}

func UnitToName(u string) string {
	switch u {
	case "ns":
		return " ns"
	case "us", "µs":
		return " us"
	case "ms":
		return " ms"
	case "s":
		return " s"
	case "m":
		return " minutes"
	case "h":
		return " hours"
	case "d":
		return " days"
	case "bytes":
		return " bytes"
	case "decbytes":
		return " bytes"
	case "bits":
		return " bits"
	case "decbits":
		return " bits"
	case "kbytes":
		return " KiB"
	case "decKbytes", "deckbytes":
		return " kB"
	case "mbytes":
		return " MiB"
	case "decMbytes", "decmbytes":
		return " MB"
	case "gbytes":
		return " GiB"
	case "decGbytes", "decgbytes":
		return " GB"
	case "tbytes":
		return " TiB"
	case "decTbytes", "decybytes":
		return " TB"
	case "pbytes":
		return " PiB"
	case "decPbytes", "decpbytes":
		return " PB"
	case "binBps":
		return " bytes/sec(IEC)"
	case "Bps":
		return " bytes/sec(SI)"
	case "binbps":
		return " bits/sec(IEC)"
	case "bps":
		return " bits/sec(SI)"
	case "KiBs":
		return " KiB/sec"
	case "Kibits":
		return " Kibit/sec"
	case "KBs":
		return " kB/sec"
	case "Kbits":
		return " kbit/sec"
	case "MiBs":
		return " MiB/sec"
	case "Mibits":
		return " Mibit/sec"
	case "MBs":
		return " MB/sec"
	case "Mbits":
		return " Mbit/sec"
	case "GiBs":
		return " GiB/sec"
	case "Gibits":
		return " Gibit/sec"
	case "GBs":
		return " GB/sec"
	case "Gbits":
		return " Gbit/sec"
	case "TiBs":
		return " TiB/sec"
	case "Tibits":
		return " Tibit/sec"
	case "TBs":
		return " TB/sec"
	case "Tbits":
		return " Tbit/sec"
	case "PiBs":
		return " PiB/sec"
	case "Pibits":
		return " Pibit/sec"
	case "PBs":
		return " PB/sec"
	case "Pbits":
		return " Pbit/sec"
	case "percent":
		return " %"
	case "percentunit":
		return " %"
	case "bool":
		return ""
	case "bool_yes_no":
		return ""
	case "bool_true_false":
		return ""
	case "bool_1_0":
		return ""
	case "cps":
		return " counts/sec (cps)"
	case "ops":
		return " ops/sec (ops)"
	case "reqps":
		return " requests/sec (rps)"
	case "rps":
		return " reads/sec (rps)"
	case "wps":
		return " writes/sec (wps)"
	case "iops":
		return " I/O ops/sec (iops)"
	case "cpm":
		return " counts/min (cpm)"
	case "opm":
		return " ops/min (opm)"
	case "rpm":
		return " reads/min (rpm)"
	case "wpm":
		return " writes/min (wpm)"
	default:
		return u
	}
}

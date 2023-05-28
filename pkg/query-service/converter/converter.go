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
	Convert(v Value, to Unit) Value
}

// noneConverter is a converter that does not convert
type noneConverter struct{}

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
	case "ns", "us", "ms", "s", "m", "h", "d":
		return DurationConverter
	case "bytes", "decbytes", "bits", "decbits", "kbytes", "decKbytes", "mbytes", "decMbytes", "gbytes", "decGbytes", "tbytes", "decTbytes", "pbytes", "decPbytes":
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

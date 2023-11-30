package converter

const (
	// base 10 (SI prefixes)
	Bit       float64 = 1e0
	Kilobit           = Bit * 1e3
	Megabit           = Bit * 1e6
	Gigabit           = Bit * 1e9
	Terabit           = Bit * 1e12
	Petabit           = Bit * 1e15
	Exabit            = Bit * 1e18
	Zettabit          = Bit * 1e21
	Yottabit          = Bit * 1e24
	Ronnabit          = Bit * 1e27
	Quettabit         = Bit * 1e30

	Byte       = Bit * 8
	Kilobyte   = Byte * 1e3
	Megabyte   = Byte * 1e6
	Gigabyte   = Byte * 1e9
	Terabyte   = Byte * 1e12
	Petabyte   = Byte * 1e15
	Exabyte    = Byte * 1e18
	Zettabyte  = Byte * 1e21
	Yottabyte  = Byte * 1e24
	Ronnabyte  = Byte * 1e27
	Quettabyte = Byte * 1e30

	// base 2 (IEC prefixes)
	Kibibit = Bit * 1024
	Mebibit = Kibibit * 1024
	Gibibit = Mebibit * 1024
	Tebibit = Gibibit * 1024
	Pebibit = Tebibit * 1024
	Exbibit = Pebibit * 1024
	Zebibit = Exbibit * 1024
	Yobibit = Zebibit * 1024

	Kibibyte = Byte * 1024
	Mebibyte = Kibibyte * 1024
	Gibibyte = Mebibyte * 1024
	Tebibyte = Gibibyte * 1024
	Pebibyte = Tebibyte * 1024
	Exbibyte = Pebibyte * 1024
	Zebibyte = Exbibyte * 1024
	Yobibyte = Zebibyte * 1024
)

// dataConverter is a Converter for data units.
type dataConverter struct {
}

func NewDataConverter() Converter {
	return &dataConverter{}
}

func (*dataConverter) Name() string {
	return "data"
}

func FromDataUnit(u Unit) float64 {
	switch u {
	case "bytes": // base 2
		return Byte
	case "decbytes": // base 10
		return Byte
	case "bits": // base 2
		return Bit
	case "decbits": // base 10
		return Bit
	case "kbytes": // base 2
		return Kibibyte
	case "decKbytes", "deckbytes": // base 10
		return Kilobyte
	case "mbytes": // base 2
		return Mebibyte
	case "decMbytes", "decmbytes": // base 10
		return Megabyte
	case "gbytes": // base 2
		return Gibibyte
	case "decGbytes", "decgbytes": // base 10
		return Gigabyte
	case "tbytes": // base 2
		return Tebibyte
	case "decTbytes", "dectbytes": // base 10
		return Terabyte
	case "pbytes": // base 2
		return Pebibyte
	case "decPbytes", "decpbytes": // base 10
		return Petabyte
	default:
		return 1
	}
}

func (c *dataConverter) Convert(v Value, to Unit) Value {
	return Value{
		F: v.F * FromDataUnit(v.U) / FromDataUnit(to),
		U: to,
	}
}

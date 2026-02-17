package converter

const (
	// base 10 (SI prefixes)
	BitPerSecond      float64 = 1e0
	KilobitPerSecond          = BitPerSecond * 1e3
	MegabitPerSecond          = BitPerSecond * 1e6
	GigabitPerSecond          = BitPerSecond * 1e9
	TerabitPerSecond          = BitPerSecond * 1e12
	PetabitPerSecond          = BitPerSecond * 1e15
	ExabitPerSecond           = BitPerSecond * 1e18
	ZettabitPerSecond         = BitPerSecond * 1e21
	YottabitPerSecond         = BitPerSecond * 1e24

	BytePerSecond      = BitPerSecond * 8
	KilobytePerSecond  = BytePerSecond * 1e3
	MegabytePerSecond  = BytePerSecond * 1e6
	GigabytePerSecond  = BytePerSecond * 1e9
	TerabytePerSecond  = BytePerSecond * 1e12
	PetabytePerSecond  = BytePerSecond * 1e15
	ExabytePerSecond   = BytePerSecond * 1e18
	ZettabytePerSecond = BytePerSecond * 1e21
	YottabytePerSecond = BytePerSecond * 1e24

	// base 2 (IEC prefixes)
	KibibitPerSecond = BitPerSecond * 1024
	MebibitPerSecond = KibibitPerSecond * 1024
	GibibitPerSecond = MebibitPerSecond * 1024
	TebibitPerSecond = GibibitPerSecond * 1024
	PebibitPerSecond = TebibitPerSecond * 1024
	ExbibitPerSecond = PebibitPerSecond * 1024
	ZebibitPerSecond = ExbibitPerSecond * 1024
	YobibitPerSecond = ZebibitPerSecond * 1024

	KibibytePerSecond = BytePerSecond * 1024
	MebibytePerSecond = KibibytePerSecond * 1024
	GibibytePerSecond = MebibytePerSecond * 1024
	TebibytePerSecond = GibibytePerSecond * 1024
	PebibytePerSecond = TebibytePerSecond * 1024
	ExbibytePerSecond = PebibytePerSecond * 1024
	ZebibytePerSecond = ExbibytePerSecond * 1024
	YobibytePerSecond = ZebibytePerSecond * 1024
)

// dataRateConverter is a Converter implementation for data rates
type dataRateConverter struct {
}

func NewDataRateConverter() Converter {
	return &dataRateConverter{}
}

func (*dataRateConverter) Name() string {
	return "data_rate"
}

// Notation followed by UCUM:
// https://ucum.org/ucum
// kibi = Ki, mebi = Mi, gibi = Gi, tebi = Ti, pibi = Pi
// kilo = k, mega = M, giga = G, tera = T, peta = P
// exa = E, zetta = Z, yotta = Y
// byte = By, bit = bit
func FromDataRateUnit(u Unit) float64 {
	// See https://github.com/SigNoz/signoz/blob/5a81f5f90b34845f5b4b3bdd46acf29d04bf3987/frontend/src/container/NewWidget/RightContainer/dataFormatCategories.ts#L62-L85
	switch u {
	case "binBps": // bytes/sec(IEC)
		return BytePerSecond
	case "Bps", "By/s": // bytes/sec(SI)
		return BytePerSecond
	case "binbps": // bits/sec(IEC)
		return BitPerSecond
	case "bps", "bit/s": // bits/sec(SI)
		return BitPerSecond
	case "KiBs", "KiBy/s": // kibibytes/sec
		return KibibytePerSecond
	case "Kibits", "Kibit/s": // kibibits/sec
		return KibibitPerSecond
	case "KBs", "kBy/s": // kilobytes/sec
		return KilobytePerSecond
	case "Kbits", "kbit/s": // kilobits/sec
		return KilobitPerSecond
	case "MiBs", "MiBy/s": // mebibytes/sec
		return MebibytePerSecond
	case "Mibits", "Mibit/s": // mebibits/sec
		return MebibitPerSecond
	case "MBs", "MBy/s": // megabytes/sec
		return MegabytePerSecond
	case "Mbits", "Mbit/s": // megabits/sec
		return MegabitPerSecond
	case "GiBs", "GiBy/s": // gibibytes/sec
		return GibibytePerSecond
	case "Gibits", "Gibit/s": // gibibits/sec
		return GibibitPerSecond
	case "GBs", "GBy/s": // gigabytes/sec
		return GigabytePerSecond
	case "Gbits", "Gbit/s": // gigabits/sec
		return GigabitPerSecond
	case "TiBs", "TiBy/s": // tebibytes/sec
		return TebibytePerSecond
	case "Tibits", "Tibit/s": // tebibits/sec
		return TebibitPerSecond
	case "TBs", "TBy/s": // terabytes/sec
		return TerabytePerSecond
	case "Tbits", "Tbit/s": // terabits/sec
		return TerabitPerSecond
	case "PiBs", "PiBy/s": // pebibytes/sec
		return PebibytePerSecond
	case "Pibits", "Pibit/s": // pebibits/sec
		return PebibitPerSecond
	case "PBs", "PBy/s": // petabytes/sec
		return PetabytePerSecond
	case "Pbits", "Pbit/s": // petabits/sec
		return PetabitPerSecond
	case "EBy/s": // exabytes/sec
		return ExabytePerSecond
	case "Ebit/s": // exabits/sec
		return ExabitPerSecond
	case "EiBy/s": // exbibytes/sec
		return ExbibytePerSecond
	case "Eibit/s": // exbibits/sec
		return ExbibitPerSecond
	case "ZBy/s": // zettabytes/sec
		return ZettabytePerSecond
	case "Zbit/s": // zettabits/sec
		return ZettabitPerSecond
	case "ZiBy/s": // zebibytes/sec
		return ZebibytePerSecond
	case "Zibit/s": // zebibits/sec
		return ZebibitPerSecond
	case "YBy/s": // yottabytes/sec
		return YottabytePerSecond
	case "Ybit/s": // yottabits/sec
		return YottabitPerSecond
	case "YiBy/s": // yobibytes/sec
		return YobibytePerSecond
	case "Yibit/s": // yobibits/sec
		return YobibitPerSecond
	default:
		return 1
	}
}

func (c *dataRateConverter) Convert(v Value, to Unit) Value {
	return Value{
		F: v.F * FromDataRateUnit(v.U) / FromDataRateUnit(to),
		U: to,
	}
}

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

func FromDataRateUnit(u Unit) float64 {
	// See https://github.com/SigNoz/signoz/blob/5a81f5f90b34845f5b4b3bdd46acf29d04bf3987/frontend/src/container/NewWidget/RightContainer/dataFormatCategories.ts#L62-L85
	switch u {
	case "binBps": // bytes/sec(IEC)
		return BytePerSecond
	case "Bps": // bytes/sec(SI)
		return BytePerSecond
	case "binbps": // bits/sec(IEC)
		return BitPerSecond
	case "bps": // bits/sec(SI)
		return BitPerSecond
	case "KiBs": // kibibytes/sec
		return KibibytePerSecond
	case "Kibits": // kibibits/sec
		return KibibitPerSecond
	case "KBs": // kilobytes/sec
		return KilobytePerSecond
	case "Kbits": // kilobits/sec
		return KilobitPerSecond
	case "MiBs": // mebibytes/sec
		return MebibytePerSecond
	case "Mibits": // mebibits/sec
		return MebibitPerSecond
	case "MBs": // megabytes/sec
		return MegabytePerSecond
	case "Mbits": // megabits/sec
		return MegabitPerSecond
	case "GiBs": // gibibytes/sec
		return GibibytePerSecond
	case "Gibits": // gibibits/sec
		return GibibitPerSecond
	case "GBs": // gigabytes/sec
		return GigabytePerSecond
	case "Gbits": // gigabits/sec
		return GigabitPerSecond
	case "TiBs": // tebibytes/sec
		return TebibytePerSecond
	case "Tibits": // tebibits/sec
		return TebibitPerSecond
	case "TBs": // terabytes/sec
		return TerabytePerSecond
	case "Tbits": // terabits/sec
		return TerabitPerSecond
	case "PiBs": // pebibytes/sec
		return PebibytePerSecond
	case "Pibits": // pebibits/sec
		return PebibitPerSecond
	case "PBs": // petabytes/sec
		return PetabytePerSecond
	case "Pbits": // petabits/sec
		return PetabitPerSecond
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

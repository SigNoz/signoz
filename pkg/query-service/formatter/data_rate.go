package formatter

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/query-service/converter"
	"github.com/dustin/go-humanize"
)

type dataRateFormatter struct {
}

func NewDataRateFormatter() Formatter {
	return &dataRateFormatter{}
}

func (*dataRateFormatter) Name() string {
	return "data_rate"
}

func (f *dataRateFormatter) Format(value float64, unit string) string {
	switch unit {
	case "binBps":
		return humanize.IBytes(uint64(value)) + "/s"
	case "Bps", "By/s":
		return humanize.Bytes(uint64(value)) + "/s"
	case "binbps":
		// humanize.IBytes/Bytes doesn't support bits
		// and returns 0 B for values less than a byte
		if value < 8 {
			return fmt.Sprintf("%v b/s", value)
		}
		return humanize.IBytes(uint64(value/8)) + "/s"
	case "bps", "bit/s":
		if value < 8 {
			return fmt.Sprintf("%v b/s", value)
		}
		return humanize.Bytes(uint64(value/8)) + "/s"
	case "KiBs", "KiBy/s":
		return humanize.IBytes(uint64(value*converter.KibibitPerSecond)) + "/s"
	case "Kibits", "Kibit/s":
		return humanize.IBytes(uint64(value*converter.KibibitPerSecond/8)) + "/s"
	case "KBs", "kBy/s":
		return humanize.IBytes(uint64(value*converter.KilobitPerSecond)) + "/s"
	case "Kbits", "kbit/s":
		return humanize.Bytes(uint64(value*converter.KilobitPerSecond/8)) + "/s"
	case "MiBs", "MiBy/s":
		return humanize.IBytes(uint64(value*converter.MebibitPerSecond)) + "/s"
	case "Mibits", "Mibit/s":
		return humanize.IBytes(uint64(value*converter.MebibitPerSecond/8)) + "/s"
	case "MBs", "MBy/s":
		return humanize.IBytes(uint64(value*converter.MegabitPerSecond)) + "/s"
	case "Mbits", "Mbit/s":
		return humanize.Bytes(uint64(value*converter.MegabitPerSecond/8)) + "/s"
	case "GiBs", "GiBy/s":
		return humanize.IBytes(uint64(value*converter.GibibitPerSecond)) + "/s"
	case "Gibits", "Gibit/s":
		return humanize.IBytes(uint64(value*converter.GibibitPerSecond/8)) + "/s"
	case "GBs", "GBy/s":
		return humanize.IBytes(uint64(value*converter.GigabitPerSecond)) + "/s"
	case "Gbits", "Gbit/s":
		return humanize.Bytes(uint64(value*converter.GigabitPerSecond/8)) + "/s"
	case "TiBs", "TiBy/s":
		return humanize.IBytes(uint64(value*converter.TebibitPerSecond)) + "/s"
	case "Tibits", "Tibit/s":
		return humanize.IBytes(uint64(value*converter.TebibitPerSecond/8)) + "/s"
	case "TBs", "TBy/s":
		return humanize.IBytes(uint64(value*converter.TerabitPerSecond)) + "/s"
	case "Tbits", "Tbit/s":
		return humanize.Bytes(uint64(value*converter.TerabitPerSecond/8)) + "/s"
	case "PiBs", "PiBy/s":
		return humanize.IBytes(uint64(value*converter.PebibitPerSecond)) + "/s"
	case "Pibits", "Pibit/s":
		return humanize.IBytes(uint64(value*converter.PebibitPerSecond/8)) + "/s"
	case "PBs", "PBy/s":
		return humanize.IBytes(uint64(value*converter.PetabitPerSecond)) + "/s"
	case "Pbits", "Pbit/s":
		return humanize.Bytes(uint64(value*converter.PetabitPerSecond/8)) + "/s"
	// Exa units
	case "EBy/s":
		return humanize.Bytes(uint64(value*converter.ExabitPerSecond)) + "/s"
	case "Ebit/s":
		return humanize.Bytes(uint64(value*converter.ExabitPerSecond/8)) + "/s"
	case "EiBy/s":
		return humanize.IBytes(uint64(value*converter.ExbibitPerSecond)) + "/s"
	case "Eibit/s":
		return humanize.IBytes(uint64(value*converter.ExbibitPerSecond/8)) + "/s"
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

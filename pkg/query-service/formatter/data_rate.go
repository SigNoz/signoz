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
		return humanize.IBytes(uint64(value*converter.BitPerSecond)) + "/s"
	case "bps", "bit/s":
		return humanize.Bytes(uint64(value*converter.BitPerSecond)) + "/s"
	case "KiBs", "KiBy/s", "Kibits", "Kibit/s":
		return humanize.IBytes(uint64(value*converter.KibibitPerSecond)) + "/s"
	case "KBs", "kBy/s", "Kbits", "kbit/s":
		return humanize.IBytes(uint64(value*converter.KilobitPerSecond)) + "/s"
	case "MiBs", "MiBy/s", "Mibits", "Mibit/s":
		return humanize.IBytes(uint64(value*converter.MebibitPerSecond)) + "/s"
	case "MBs", "MBy/s", "Mbits", "Mbit/s":
		return humanize.IBytes(uint64(value*converter.MegabitPerSecond)) + "/s"
	case "GiBs", "GiBy/s", "Gibits", "Gibit/s":
		return humanize.IBytes(uint64(value*converter.GibibitPerSecond)) + "/s"
	case "GBs", "GBy/s", "Gbits", "Gbit/s":
		return humanize.IBytes(uint64(value*converter.GigabitPerSecond)) + "/s"
	case "TiBs", "TiBy/s", "Tibits", "Tibit/s":
		return humanize.IBytes(uint64(value*converter.TebibitPerSecond)) + "/s"
	case "TBs", "TBy/s", "Tbits", "Tbit/s":
		return humanize.IBytes(uint64(value*converter.TerabitPerSecond)) + "/s"
	case "PiBs", "PiBy/s", "Pibits", "Pibit/s":
		return humanize.IBytes(uint64(value*converter.PebibitPerSecond)) + "/s"
	case "PBs", "PBy/s", "Pbits", "Pbit/s":
		return humanize.IBytes(uint64(value*converter.PetabitPerSecond)) + "/s"
	// Exa units
	case "EBy/s", "Ebit/s":
		return humanize.Bytes(uint64(value*converter.ExabitPerSecond)) + "/s"
	case "EiBy/s", "Eibit/s":
		return humanize.IBytes(uint64(value*converter.ExbibitPerSecond)) + "/s"
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

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
	case "KiBs":
		return humanize.IBytes(uint64(value*converter.KibibitPerSecond)) + "/s"
	case "Kibits":
		return humanize.IBytes(uint64(value*converter.KibibytePerSecond)) + "/s"
	case "KBs", "kBy/s":
		return humanize.IBytes(uint64(value*converter.KilobitPerSecond)) + "/s"
	case "Kbits", "kbit/s":
		return humanize.IBytes(uint64(value*converter.KilobytePerSecond)) + "/s"
	case "MiBs":
		return humanize.IBytes(uint64(value*converter.MebibitPerSecond)) + "/s"
	case "Mibits":
		return humanize.IBytes(uint64(value*converter.MebibytePerSecond)) + "/s"
	case "MBs", "MBy/s":
		return humanize.IBytes(uint64(value*converter.MegabitPerSecond)) + "/s"
	case "Mbits", "Mbit/s":
		return humanize.IBytes(uint64(value*converter.MegabytePerSecond)) + "/s"
	case "GiBs":
		return humanize.IBytes(uint64(value*converter.GibibitPerSecond)) + "/s"
	case "Gibits":
		return humanize.IBytes(uint64(value*converter.GibibytePerSecond)) + "/s"
	case "GBs", "GBy/s":
		return humanize.IBytes(uint64(value*converter.GigabitPerSecond)) + "/s"
	case "Gbits", "Gbit/s":
		return humanize.IBytes(uint64(value*converter.GigabytePerSecond)) + "/s"
	case "TiBs":
		return humanize.IBytes(uint64(value*converter.TebibitPerSecond)) + "/s"
	case "Tibits":
		return humanize.IBytes(uint64(value*converter.TebibytePerSecond)) + "/s"
	case "TBs", "TBy/s":
		return humanize.IBytes(uint64(value*converter.TerabitPerSecond)) + "/s"
	case "Tbits", "Tbit/s":
		return humanize.IBytes(uint64(value*converter.TerabytePerSecond)) + "/s"
	case "PiBs":
		return humanize.IBytes(uint64(value*converter.PebibitPerSecond)) + "/s"
	case "Pibits":
		return humanize.IBytes(uint64(value*converter.PebibytePerSecond)) + "/s"
	case "PBs", "PBy/s":
		return humanize.IBytes(uint64(value*converter.PetabitPerSecond)) + "/s"
	case "Pbits", "Pbit/s":
		return humanize.IBytes(uint64(value*converter.PetabytePerSecond)) + "/s"
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

package formatter

import (
	"fmt"

	"github.com/dustin/go-humanize"
	"go.signoz.io/signoz/pkg/query-service/converter"
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
	case "Bps":
		return humanize.Bytes(uint64(value)) + "/s"
	case "binbps":
		return humanize.IBytes(uint64(value*converter.BitPerSecond)) + "/s"
	case "bps":
		return humanize.Bytes(uint64(value*converter.BitPerSecond)) + "/s"
	case "KiBs":
		return humanize.IBytes(uint64(value*converter.KibibitPerSecond)) + "/s"
	case "Kibits":
		return humanize.IBytes(uint64(value*converter.KibibytePerSecond)) + "/s"
	case "KBs":
		return humanize.IBytes(uint64(value*converter.KilobitPerSecond)) + "/s"
	case "Kbits":
		return humanize.IBytes(uint64(value*converter.KilobytePerSecond)) + "/s"
	case "MiBs":
		return humanize.IBytes(uint64(value*converter.MebibitPerSecond)) + "/s"
	case "Mibits":
		return humanize.IBytes(uint64(value*converter.MebibytePerSecond)) + "/s"
	case "MBs":
		return humanize.IBytes(uint64(value*converter.MegabitPerSecond)) + "/s"
	case "Mbits":
		return humanize.IBytes(uint64(value*converter.MegabytePerSecond)) + "/s"
	case "GiBs":
		return humanize.IBytes(uint64(value*converter.GibibitPerSecond)) + "/s"
	case "Gibits":
		return humanize.IBytes(uint64(value*converter.GibibytePerSecond)) + "/s"
	case "GBs":
		return humanize.IBytes(uint64(value*converter.GigabitPerSecond)) + "/s"
	case "Gbits":
		return humanize.IBytes(uint64(value*converter.GigabytePerSecond)) + "/s"
	case "TiBs":
		return humanize.IBytes(uint64(value*converter.TebibitPerSecond)) + "/s"
	case "Tibits":
		return humanize.IBytes(uint64(value*converter.TebibytePerSecond)) + "/s"
	case "TBs":
		return humanize.IBytes(uint64(value*converter.TerabitPerSecond)) + "/s"
	case "Tbits":
		return humanize.IBytes(uint64(value*converter.TerabytePerSecond)) + "/s"
	case "PiBs":
		return humanize.IBytes(uint64(value*converter.PebibitPerSecond)) + "/s"
	case "Pibits":
		return humanize.IBytes(uint64(value*converter.PebibytePerSecond)) + "/s"
	case "PBs":
		return humanize.IBytes(uint64(value*converter.PetabitPerSecond)) + "/s"
	case "Pbits":
		return humanize.IBytes(uint64(value*converter.PetabytePerSecond)) + "/s"
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

package formatter

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/query-service/converter"
	"github.com/dustin/go-humanize"
)

type dataFormatter struct {
}

func NewDataFormatter() Formatter {
	return &dataFormatter{}
}

func (*dataFormatter) Name() string {
	return "data"
}

func (f *dataFormatter) Format(value float64, unit string) string {
	switch unit {
	case "bytes", "By":
		return humanize.IBytes(uint64(value))
	case "decbytes":
		return humanize.Bytes(uint64(value))
	case "kbytes", "KiBy", "Kibit":
		return humanize.IBytes(uint64(value * converter.Kibibit))
	case "decKbytes", "deckbytes", "kBy", "kbit":
		return humanize.Bytes(uint64(value * converter.Kilobit))
	case "mbytes", "MiBy", "Mibit":
		return humanize.IBytes(uint64(value * converter.Mebibit))
	case "decMbytes", "decmbytes", "MBy", "Mbit":
		return humanize.Bytes(uint64(value * converter.Megabit))
	case "gbytes", "GiBy", "Gibit":
		return humanize.IBytes(uint64(value * converter.Gibibit))
	case "decGbytes", "decgbytes", "GBy", "Gbit":
		return humanize.Bytes(uint64(value * converter.Gigabit))
	case "tbytes", "TiBy", "Tibit":
		return humanize.IBytes(uint64(value * converter.Tebibit))
	case "decTbytes", "dectbytes", "TBy", "Tbit":
		return humanize.Bytes(uint64(value * converter.Terabit))
	case "pbytes", "PiBy", "Pibit":
		return humanize.IBytes(uint64(value * converter.Pebibit))
	case "decPbytes", "decpbytes", "PBy", "Pbit":
		return humanize.Bytes(uint64(value * converter.Petabit))
	case "EiBy":
		return humanize.IBytes(uint64(value * converter.Exbibit))
	case "EBy", "Ebit":
		return humanize.Bytes(uint64(value * converter.Exabit))
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

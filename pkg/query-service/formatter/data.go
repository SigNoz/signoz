package formatter

import (
	"fmt"

	"github.com/dustin/go-humanize"
	"go.signoz.io/signoz/pkg/query-service/converter"
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
	case "bytes":
		return humanize.IBytes(uint64(value))
	case "decbytes":
		return humanize.Bytes(uint64(value))
	case "bits":
		return humanize.IBytes(uint64(value * converter.Bit))
	case "decbits":
		return humanize.Bytes(uint64(value * converter.Bit))
	case "kbytes":
		return humanize.IBytes(uint64(value * converter.Kibibit))
	case "decKbytes", "deckbytes":
		return humanize.IBytes(uint64(value * converter.Kilobit))
	case "mbytes":
		return humanize.IBytes(uint64(value * converter.Mebibit))
	case "decMbytes", "decmbytes":
		return humanize.Bytes(uint64(value * converter.Megabit))
	case "gbytes":
		return humanize.IBytes(uint64(value * converter.Gibibit))
	case "decGbytes", "decgbytes":
		return humanize.Bytes(uint64(value * converter.Gigabit))
	case "tbytes":
		return humanize.IBytes(uint64(value * converter.Tebibit))
	case "decTbytes", "dectbytes":
		return humanize.Bytes(uint64(value * converter.Terabit))
	case "pbytes":
		return humanize.IBytes(uint64(value * converter.Pebibit))
	case "decPbytes", "decpbytes":
		return humanize.Bytes(uint64(value * converter.Petabit))
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

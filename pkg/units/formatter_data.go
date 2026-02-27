package units

import (
	"fmt"

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
	case "bits", "bit":
		// humanize.IBytes/Bytes doesn't support bits
		// and returns 0 B for values less than a byte
		if value < 8 {
			return fmt.Sprintf("%v b", value)
		}
		return humanize.IBytes(uint64(value / 8))
	case "decbits":
		if value < 8 {
			return fmt.Sprintf("%v b", value)
		}
		return humanize.Bytes(uint64(value / 8))
	case "kbytes", "KiBy":
		return humanize.IBytes(uint64(value * Kibibit))
	case "Kibit":
		return humanize.IBytes(uint64(value * Kibibit / 8))
	case "decKbytes", "deckbytes", "kBy":
		return humanize.Bytes(uint64(value * Kilobit))
	case "kbit":
		return humanize.Bytes(uint64(value * Kilobit / 8))
	case "mbytes", "MiBy":
		return humanize.IBytes(uint64(value * Mebibit))
	case "Mibit":
		return humanize.IBytes(uint64(value * Mebibit / 8))
	case "decMbytes", "decmbytes", "MBy":
		return humanize.Bytes(uint64(value * Megabit))
	case "Mbit":
		return humanize.Bytes(uint64(value * Megabit / 8))
	case "gbytes", "GiBy":
		return humanize.IBytes(uint64(value * Gibibit))
	case "Gibit":
		return humanize.IBytes(uint64(value * Gibibit / 8))
	case "decGbytes", "decgbytes", "GBy":
		return humanize.Bytes(uint64(value * Gigabit))
	case "Gbit":
		return humanize.Bytes(uint64(value * Gigabit / 8))
	case "tbytes", "TiBy":
		return humanize.IBytes(uint64(value * Tebibit))
	case "Tibit":
		return humanize.IBytes(uint64(value * Tebibit / 8))
	case "decTbytes", "dectbytes", "TBy":
		return humanize.Bytes(uint64(value * Terabit))
	case "Tbit":
		return humanize.Bytes(uint64(value * Terabit / 8))
	case "pbytes", "PiBy":
		return humanize.IBytes(uint64(value * Pebibit))
	case "Pbit":
		return humanize.Bytes(uint64(value * Petabit / 8))
	case "decPbytes", "decpbytes", "PBy":
		return humanize.Bytes(uint64(value * Petabit))
	case "EiBy":
		return humanize.IBytes(uint64(value * Exbibit))
	case "Ebit":
		return humanize.Bytes(uint64(value * Exabit / 8))
	case "EBy":
		return humanize.Bytes(uint64(value * Exabit))
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

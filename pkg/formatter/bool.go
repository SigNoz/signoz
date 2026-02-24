package formatter

import "fmt"

type boolFormatter struct{}

func NewBoolFormatter() Formatter {
	return &boolFormatter{}
}

func (*boolFormatter) Name() string {
	return "bool"
}

func toBool(value float64) string {
	if value == 0 {
		return "false"
	}
	return "true"
}

func toBoolYesNo(value float64) string {
	if value == 0 {
		return "no"
	}
	return "yes"
}

func toBoolOnOff(value float64) string {
	if value == 0 {
		return "off"
	}
	return "on"
}

func (f *boolFormatter) Format(value float64, unit string) string {

	switch unit {
	case "bool":
		return toBool(value)
	case "bool_yes_no":
		return toBoolYesNo(value)
	case "bool_on_off":
		return toBoolOnOff(value)
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)

}

package formatter

import "fmt"

type noneFormatter struct{}

func NewNoneFormatter() Formatter {
	return &noneFormatter{}
}

func (*noneFormatter) Name() string {
	return "none"
}

func (f *noneFormatter) Format(value float64, unit string) string {
	return fmt.Sprintf("%v", value)
}

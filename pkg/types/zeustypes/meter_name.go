package zeustypes

import (
	"encoding/json"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	MeterSpanSize       = MustNewMeterName("signoz.meter.span.size")
	MeterLogSize        = MustNewMeterName("signoz.meter.log.size")
	MeterDatapointCount = MustNewMeterName("signoz.meter.metric.datapoint.count")
	MeterPlatformActive = MustNewMeterName("signoz.meter.platform.active")
)

var meterNameRegex = regexp.MustCompile(`^[a-z][a-z0-9_.]+$`)

// MeterName is a validated dotted Zeus meter name.
type MeterName struct {
	s string
}

func NewMeterName(s string) (MeterName, error) {
	if !meterNameRegex.MatchString(s) {
		return MeterName{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid meter name: %s", s)
	}

	return MeterName{s: s}, nil
}

func MustNewMeterName(s string) MeterName {
	name, err := NewMeterName(s)
	if err != nil {
		panic(err)
	}

	return name
}

func (n MeterName) String() string {
	return n.s
}

func (n MeterName) IsZero() bool {
	return n.s == ""
}

func (n MeterName) MarshalJSON() ([]byte, error) {
	return json.Marshal(n.s)
}

func (n *MeterName) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	name, err := NewMeterName(s)
	if err != nil {
		return err
	}

	*n = name
	return nil
}

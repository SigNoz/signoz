package converter

type Duration float64

const (
	Nanosecond           = Second * 1e-9
	Microsecond          = Second * 1e-6
	Millisecond          = Second * 1e-3
	Centisecond          = Second * 1e-2
	Decisecond           = Second * 1e-1
	Second      Duration = 1e0
	Minute               = Second * 60
	Hour                 = Minute * 60
	Day                  = Hour * 24
	Week                 = Day * 7
)

// durationConverter is an implementation of Converter for durations.
type durationConverter struct {
}

func NewDurationConverter() Converter {
	return &durationConverter{}
}

func (*durationConverter) Name() string {
	return "duration"
}

func FromTimeUnit(u Unit) Duration {
	switch u {
	case "ns":
		return Nanosecond
	case "us", "µs":
		return Microsecond
	case "ms":
		return Millisecond
	case "cs":
		return Centisecond
	case "ds":
		return Decisecond
	case "s":
		return Second
	case "m":
		return Minute
	case "h":
		return Hour
	case "d":
		return Day
	case "w":
		return Week
	default:
		return Second
	}
}

func (c *durationConverter) Convert(v Value, to Unit) Value {
	return Value{
		F: v.F * float64(FromTimeUnit(v.U)) / float64(FromTimeUnit(to)),
		U: to,
	}
}

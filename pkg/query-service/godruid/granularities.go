package godruid

type Granlarity interface{}

type SimpleGran string

const (
	GranAll        SimpleGran = "all"
	GranNone       SimpleGran = "none"
	GranMinute     SimpleGran = "minute"
	GranFifteenMin SimpleGran = "fifteen_minute"
	GranThirtyMin  SimpleGran = "thirty_minute"
	GranHour       SimpleGran = "hour"
	GranDay        SimpleGran = "day"
)

type GranDuration struct {
	Type string `json:"type"`

	Duration string `json:"duration"`
	Origin   string `json:"origin,omitempty"`
}

type GranPeriod struct {
	Type string `json:"type"`

	Period   string `json:"period"`
	TimeZone string `json:"timeZone,omitempty"`
	Origin   string `json:"origin,omitempty"`
}

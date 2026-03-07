package render

var (
	StatusSuccess status = status{"success"}
	StatusError          = status{"error"}
)

// Defines custom error types
type status struct{ s string }

func (s status) String() string {
	return s.s
}

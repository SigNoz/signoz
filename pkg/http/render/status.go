package render

var (
	StatusSuccess status = status{"success"}
	StatusError          = status{"error"}
)

// Defines custom error types
type status struct{ s string }

package signozio

type status string

type ConfigResult struct {
	Status    status            `json:"status"`
	Data      map[string]Config `json:"data,omitempty"`
	ErrorType string            `json:"errorType,omitempty"`
	Error     string            `json:"error,omitempty"`
}

type Config struct {
	Enabled            bool             `json:"enabled"`
	FrontendPositionID string           `json:"frontendPositionId"`
	Components         []ComponentProps `json:"components"`
}

type ComponentProps struct {
	Text     string `json:"text"`
	Position int    `json:"position"`
	IconLink string `json:"iconLink"`
	Href     string `json:"href"`
}

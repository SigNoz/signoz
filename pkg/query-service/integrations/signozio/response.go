package signozio

type status string

type ConfigResult struct {
	Status    status            `json:"status"`
	Data      map[string]Config `json:"data,omitempty"`
	ErrorType string            `json:"errorType,omitempty"`
	Error     string            `json:"error,omitempty"`
}

type Config struct {
	Enabled            bool             `json:"Enabled"`
	FrontendPositionID string           `json:"FrontendPositionId"`
	Components         []ComponentProps `json:"Components"`
}

type ComponentProps struct {
	Text     string `json:"Text"`
	Position int    `json:"Position"`
	IconLink string `json:"IconLink"`
	Href     string `json:"Href"`
}

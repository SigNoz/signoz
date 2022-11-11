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

var DefaultConfig = map[string]Config{
	"helpConfig": {
		Enabled:            true,
		FrontendPositionID: "tooltip",
		Components: []ComponentProps{
			{
				Text:     "How to use SigNoz in production",
				Position: 1,
				IconLink: "RiseOutlined",
				Href:     "https://signoz.io/docs/production-readiness",
			},
			{
				Text:     "Create an issue in GitHub",
				Position: 2,
				IconLink: "GithubOutlined",
				Href:     "https://github.com/SigNoz/signoz/issues/new/choose",
			},
			{
				Text:     "Read the docs",
				Position: 3,
				IconLink: "FileTextOutlined",
				Href:     "https://signoz.io/docs",
			},
		},
	},
}

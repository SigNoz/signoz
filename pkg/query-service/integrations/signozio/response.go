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
	FrontendPositionId string           `json:"frontendPositionId"`
	Components         []ComponentProps `json:"components"`
}

type ComponentProps struct {
	Text      string `json:"text"`
	Position  int    `json:"position"`
	DarkIcon  string `json:"darkIcon"`
	LightIcon string `json:"lightIcon"`
	Href      string `json:"href"`
}

var DefaultConfig = map[string]Config{
	"helpConfig": {
		Enabled:            true,
		FrontendPositionId: "tooltip",
		Components: []ComponentProps{
			{
				Text:      "How to use SigNoz in production",
				Position:  1,
				LightIcon: "RiseOutlined",
				DarkIcon:  "RiseOutlined",
				Href:      "https://signoz.io/docs/production-readiness",
			},
			{
				Text:      "Create an issue in GitHub",
				Position:  2,
				LightIcon: "GithubFilled",
				DarkIcon:  "GithubOutlined",
				Href:      "https://github.com/SigNoz/signoz/issues/new/choose",
			},
			{
				Text:      "Read the docs",
				Position:  3,
				LightIcon: "FileTextFilled",
				DarkIcon:  "FileTextOutlined",
				Href:      "https://signoz.io/docs",
			},
		},
	},
}

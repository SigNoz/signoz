package globaltypes

type Endpoint struct {
	ExternalURL  string  `json:"external_url" required:"true"`
	IngestionURL string  `json:"ingestion_url" required:"true"`
	MCPURL       *string `json:"mcp_url" required:"true" nullable:"true"`
}

func NewEndpoint(externalURL, ingestionURL string, mcpURL *string) Endpoint {
	return Endpoint{
		ExternalURL:  externalURL,
		IngestionURL: ingestionURL,
		MCPURL:       mcpURL,
	}
}

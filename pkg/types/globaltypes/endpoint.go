package globaltypes

type Endpoint struct {
	ExternalURL  string `json:"external_url"`
	IngestionURL string `json:"ingestion_url"`
}

func NewEndpoint(externalURL, ingestionURL string) Endpoint {
	return Endpoint{
		ExternalURL:  externalURL,
		IngestionURL: ingestionURL,
	}
}

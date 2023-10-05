package saasserver

type IngestionCred struct {
	IngestionKey string `json:"ingestionKey"`
	IngestionURL string `json:"ingestionURL"`
	Region       string `json:"region"`
}

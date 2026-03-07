package types

import "net/url"

type GettableGlobalConfig struct {
	ExternalURL  string `json:"external_url"`
	IngestionURL string `json:"ingestion_url"`
}

func NewGettableGlobalConfig(externalURL, ingestionURL *url.URL) *GettableGlobalConfig {
	return &GettableGlobalConfig{
		ExternalURL:  externalURL.String(),
		IngestionURL: ingestionURL.String(),
	}
}

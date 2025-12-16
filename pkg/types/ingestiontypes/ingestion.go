package ingestiontypes

import "net/url"

type GettableIngestion struct {
	URL string `json:"url"`
}

func NewGettableIngestion(url *url.URL) *GettableIngestion {
	return &GettableIngestion{URL: url.String()}
}

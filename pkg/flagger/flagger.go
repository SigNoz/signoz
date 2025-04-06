package flagger

import (
	"github.com/open-feature/go-sdk/openfeature"
)

type Provider = openfeature.FeatureProvider

type FlaggerHook = openfeature.Hook

type Flagger = openfeature.IClient

type flagger struct {
	*openfeature.Client
}

func New(provider Provider, hooks ...FlaggerHook) (Flagger, error) {
	client := openfeature.NewClient("signoz")

	if err := openfeature.SetNamedProviderAndWait("signoz", provider); err != nil {
		return nil, err
	}

	client.AddHooks(hooks...)

	return &flagger{Client: client}, nil
}

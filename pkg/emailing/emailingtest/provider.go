package emailingtest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

var _ emailing.Emailing = (*Provider)(nil)

type Provider struct {
	SentEmailCountByTo           map[string]int
	SentEmailCountByTemplateName map[emailtypes.TemplateName]int
}

func New() *Provider {
	return &Provider{
		SentEmailCountByTo:           make(map[string]int),
		SentEmailCountByTemplateName: make(map[emailtypes.TemplateName]int),
	}
}

func (provider *Provider) SendHTML(ctx context.Context, to string, subject string, templateName emailtypes.TemplateName, data map[string]any) error {
	provider.SentEmailCountByTo[to]++
	provider.SentEmailCountByTemplateName[templateName]++
	return nil
}

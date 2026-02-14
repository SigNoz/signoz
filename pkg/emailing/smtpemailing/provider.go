package smtpemailing

import (
	"context"
	"net/mail"

	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/emailing/templatestore/filetemplatestore"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/smtp/client"
	"github.com/SigNoz/signoz/pkg/types/emailtypes"
)

type provider struct {
	settings factory.ScopedProviderSettings
	store    emailtypes.TemplateStore
	client   *client.Client
	config   emailing.Config
}

func NewFactory() factory.ProviderFactory[emailing.Emailing, emailing.Config] {
	return factory.NewProviderFactory(factory.MustNewName("smtp"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config emailing.Config) (emailing.Emailing, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/emailing/smtpemailing")

	// Try to create a template store. If it fails, use an empty store.
	store, err := filetemplatestore.NewStore(ctx, config.Templates.Directory, emailtypes.Templates, settings.Logger())
	if err != nil {
		settings.Logger().ErrorContext(ctx, "failed to create template store, using empty store", "error", err)
		store = filetemplatestore.NewEmptyStore()
	}

	client, err := client.New(
		config.SMTP.Address,
		settings.Logger(),
		client.WithFrom(config.SMTP.From),
		client.WithHello(config.SMTP.Hello),
		client.WithHeaders(config.SMTP.Headers),
		client.WithTLS(client.TLS{
			Enabled:            config.SMTP.TLS.Enabled,
			InsecureSkipVerify: config.SMTP.TLS.InsecureSkipVerify,
			CAFilePath:         config.SMTP.TLS.CAFilePath,
			KeyFilePath:        config.SMTP.TLS.KeyFilePath,
			CertFilePath:       config.SMTP.TLS.CertFilePath,
		}),
		client.WithAuth(client.Auth{
			Username: config.SMTP.Auth.Username,
			Password: config.SMTP.Auth.Password,
			Secret:   config.SMTP.Auth.Secret,
			Identity: config.SMTP.Auth.Identity,
		}),
	)
	if err != nil {
		return nil, err
	}

	return &provider{
		settings: settings,
		store:    store,
		client:   client,
		config:   config,
	}, nil
}

func (provider *provider) SendHTML(ctx context.Context, to string, subject string, templateName emailtypes.TemplateName, data map[string]any) error {
	toAddress, err := mail.ParseAddressList(to)
	if err != nil {
		return err
	}

	template, err := provider.store.Get(ctx, templateName)
	if err != nil {
		return err
	}

	// if no data is provided, create an empty map to prevent a panic when we add the format, to, and subject data
	if data == nil {
		data = make(map[string]any)
	}

	// the following are overridden if provided in the data map
	data["format"] = provider.config.Templates.Format
	data["to"] = to
	data["subject"] = subject

	content, err := emailtypes.NewContent(template, data)
	if err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to create email content", "error", err)
		return err
	}

	return provider.client.Do(ctx, toAddress, subject, client.ContentTypeHTML, content)
}

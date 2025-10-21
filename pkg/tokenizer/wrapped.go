package tokenizer

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type wrappedTokenizer struct {
	settings  factory.ScopedProviderSettings
	tokenizer Tokenizer
}

func NewWrappedTokenizer(settings factory.ScopedProviderSettings, tokenizer Tokenizer) Tokenizer {
	return &wrappedTokenizer{
		settings:  settings,
		tokenizer: tokenizer,
	}
}

func (wrapped *wrappedTokenizer) Start(ctx context.Context) error {
	return wrapped.tokenizer.Start(ctx)
}

func (wrapped *wrappedTokenizer) Stop(ctx context.Context) error {
	return wrapped.tokenizer.Stop(ctx)
}

func (wrapped *wrappedTokenizer) CreateToken(ctx context.Context, identity *authtypes.Identity, meta map[string]string) (*authtypes.Token, error) {
	ctx, span := wrapped.settings.Tracer().Start(ctx, "tokenizer.CreateToken", trace.WithAttributes(attribute.String("tokenizer.provider", wrapped.tokenizer.Config().Provider)))
	defer span.End()

	token, err := wrapped.tokenizer.CreateToken(ctx, identity, meta)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}

	return token, nil
}

func (wrapped *wrappedTokenizer) GetIdentity(ctx context.Context, accessToken string) (*authtypes.Identity, error) {
	ctx, span := wrapped.settings.Tracer().Start(ctx, "tokenizer.GetIdentity", trace.WithAttributes(attribute.String("tokenizer.provider", wrapped.tokenizer.Config().Provider)))
	defer span.End()

	identity, err := wrapped.tokenizer.GetIdentity(ctx, accessToken)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}

	return identity, nil
}

func (wrapped *wrappedTokenizer) RotateToken(ctx context.Context, accessToken string, refreshToken string) (*authtypes.Token, error) {
	ctx, span := wrapped.settings.Tracer().Start(ctx, "tokenizer.RotateToken", trace.WithAttributes(attribute.String("tokenizer.provider", wrapped.tokenizer.Config().Provider)))
	defer span.End()

	token, err := wrapped.tokenizer.RotateToken(ctx, accessToken, refreshToken)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}

	return token, nil
}

func (wrapped *wrappedTokenizer) DeleteToken(ctx context.Context, accessToken string) error {
	ctx, span := wrapped.settings.Tracer().Start(ctx, "tokenizer.DeleteToken", trace.WithAttributes(attribute.String("tokenizer.provider", wrapped.tokenizer.Config().Provider)))
	defer span.End()

	err := wrapped.tokenizer.DeleteToken(ctx, accessToken)
	if err != nil {
		span.RecordError(err)
		return err
	}

	return nil
}

func (wrapped *wrappedTokenizer) DeleteTokensByUserID(ctx context.Context, userID valuer.UUID) error {
	ctx, span := wrapped.settings.Tracer().Start(ctx, "tokenizer.DeleteTokensByUserID", trace.WithAttributes(attribute.String("tokenizer.provider", wrapped.tokenizer.Config().Provider)))
	defer span.End()

	err := wrapped.tokenizer.DeleteTokensByUserID(ctx, userID)
	if err != nil {
		span.RecordError(err)
		return err
	}

	return nil
}

func (wrapped *wrappedTokenizer) DeleteIdentity(ctx context.Context, userID valuer.UUID) error {
	ctx, span := wrapped.settings.Tracer().Start(ctx, "tokenizer.DeleteIdentity", trace.WithAttributes(attribute.String("tokenizer.provider", wrapped.tokenizer.Config().Provider)))
	defer span.End()

	err := wrapped.tokenizer.DeleteIdentity(ctx, userID)
	if err != nil {
		span.RecordError(err)
		return err
	}

	return nil
}

func (wrapped *wrappedTokenizer) SetLastObservedAt(ctx context.Context, accessToken string, lastObservedAt time.Time) error {
	ctx, span := wrapped.settings.Tracer().Start(ctx, "tokenizer.SetLastObservedAt", trace.WithAttributes(attribute.String("tokenizer.provider", wrapped.tokenizer.Config().Provider)))
	defer span.End()

	err := wrapped.tokenizer.SetLastObservedAt(ctx, accessToken, lastObservedAt)
	if err != nil {
		span.RecordError(err)
		return err
	}

	return nil
}

func (wrapped *wrappedTokenizer) Config() Config {
	return wrapped.tokenizer.Config()
}

func (wrapped *wrappedTokenizer) ListMaxLastObservedAtByOrgID(ctx context.Context, orgID valuer.UUID) (map[valuer.UUID]time.Time, error) {
	return wrapped.tokenizer.ListMaxLastObservedAtByOrgID(ctx, orgID)
}

func (wrapped *wrappedTokenizer) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	return wrapped.tokenizer.Collect(ctx, orgID)
}

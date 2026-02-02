package sqlstorehook

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/extra/bunotel"
)

type instrumentation struct {
	bunOtel *bunotel.QueryHook
}

func NewInstrumentationFactory() factory.ProviderFactory[sqlstore.SQLStoreHook, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("instrumentation"), NewInstrumentation)
}

func NewInstrumentation(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStoreHook, error) {
	return &instrumentation{
		bunOtel: bunotel.NewQueryHook(
			bunotel.WithFormattedQueries(true),
			bunotel.WithTracerProvider(providerSettings.TracerProvider),
			bunotel.WithMeterProvider(providerSettings.MeterProvider),
		),
	}, nil
}

func (hook *instrumentation) Init(db *bun.DB) {
	hook.bunOtel.Init(db)
}

func (hook *instrumentation) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
	return hook.bunOtel.BeforeQuery(ctx, event)
}

func (hook *instrumentation) AfterQuery(ctx context.Context, event *bun.QueryEvent) {
	hook.bunOtel.AfterQuery(ctx, event)
}

package postgressqlstore

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"database/sql"
	"net/url"
	"os"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
)

var _ Pooler = new(provider)

type provider struct {
	settings  factory.ScopedProviderSettings
	sqldb     *sql.DB
	bundb     *sqlstore.BunDB
	pgxPool   *pgxpool.Pool
	dialect   *dialect
	formatter sqlstore.SQLFormatter
}

type Pooler interface {
	Pool() *pgxpool.Pool
}

func NewFactory(hookFactories ...factory.ProviderFactory[sqlstore.SQLStoreHook, sqlstore.Config]) factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("postgres"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStore, error) {
		hooks := make([]sqlstore.SQLStoreHook, len(hookFactories))
		for i, hookFactory := range hookFactories {
			hook, err := hookFactory.New(ctx, providerSettings, config)
			if err != nil {
				return nil, err
			}
			hooks[i] = hook
		}

		return New(ctx, providerSettings, config, hooks...)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config, hooks ...sqlstore.SQLStoreHook) (sqlstore.SQLStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlstore/postgressqlstore")

	pgConfig, err := pgxpool.ParseConfig(config.Postgres.DSN)
	if err != nil {
		return nil, err
	}

	// Build TLS config from structured SSL fields if any are set. Empty SSL fields
	// leave TLS handling to the DSN, preserving the prior behaviour.
	if config.Postgres.SSLMode != "" || config.Postgres.SSLCert != "" || config.Postgres.SSLKey != "" || config.Postgres.SSLRootCert != "" {
		tlsConfig, err := buildTLSConfig(config.Postgres)
		if err != nil {
			return nil, err
		}
		pgConfig.ConnConfig.TLSConfig = tlsConfig
	}

	// Set the maximum number of open connections
	pgConfig.MaxConns = int32(config.Connection.MaxOpenConns)
	pgConfig.MaxConnLifetime = config.Connection.MaxConnLifetime

	// Use pgxpool to create a connection pool
	pool, err := pgxpool.NewWithConfig(ctx, pgConfig)
	if err != nil {
		return nil, err
	}

	sqldb := stdlib.OpenDBFromPool(pool)

	pgDialect := pgdialect.New()
	bunDB := sqlstore.NewBunDB(settings, sqldb, pgDialect, hooks)
	return &provider{
		settings:  settings,
		sqldb:     sqldb,
		bundb:     bunDB,
		pgxPool:   pool,
		dialect:   new(dialect),
		formatter: newFormatter(bunDB.Dialect()),
	}, nil
}

func (provider *provider) BunDB() *bun.DB {
	return provider.bundb.DB
}

func (provider *provider) SQLDB() *sql.DB {
	return provider.sqldb
}

func (provider *provider) Pool() *pgxpool.Pool {
	return provider.pgxPool
}

func (provider *provider) Dialect() sqlstore.SQLDialect {
	return provider.dialect
}

func (provider *provider) Formatter() sqlstore.SQLFormatter {
	return provider.formatter
}

func (provider *provider) BunDBCtx(ctx context.Context) bun.IDB {
	return provider.bundb.BunDBCtx(ctx)
}

func (provider *provider) RunInTxCtx(ctx context.Context, opts *sql.TxOptions, cb func(ctx context.Context) error) error {
	return provider.bundb.RunInTxCtx(ctx, opts, cb)
}

func (provider *provider) WrapNotFoundErrf(err error, code errors.Code, format string, args ...any) error {
	if err == sql.ErrNoRows {
		return errors.Wrapf(err, errors.TypeNotFound, code, format, args...)
	}

	return err
}

func (provider *provider) WrapAlreadyExistsErrf(err error, code errors.Code, format string, args ...any) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && (pgErr.Code == "23505" || pgErr.Code == "23503") {
		return errors.Wrapf(err, errors.TypeAlreadyExists, code, format, args...)
	}

	return err
}

func (dialect *dialect) ToggleForeignKeyConstraint(ctx context.Context, bun *bun.DB, enable bool) error {
	return nil
}

// buildTLSConfig builds a *tls.Config from the structured SSL fields on PostgresConfig.
// An empty SSLMode ("disable", "allow", "prefer") returns nil to skip TLS.
// SSLCert + SSLKey load an mTLS client identity. SSLRootCert adds a CA pool for
// server verification. The host portion of the DSN is reused as ServerName.
func buildTLSConfig(cfg sqlstore.PostgresConfig) (*tls.Config, error) {
	switch cfg.SSLMode {
	case "", "disable", "allow", "prefer":
		return nil, nil
	}

	pool := x509.NewCertPool()
	if cfg.SSLRootCert != "" {
		caData, err := os.ReadFile(cfg.SSLRootCert)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to read ssl_root_cert %q", cfg.SSLRootCert)
		}
		if !pool.AppendCertsFromPEM(caData) {
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "ssl_root_cert %q did not contain any valid PEM certificates", cfg.SSLRootCert)
		}
	}

	var certs []tls.Certificate
	if cfg.SSLCert != "" || cfg.SSLKey != "" {
		if cfg.SSLCert == "" || cfg.SSLKey == "" {
			return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "ssl_cert and ssl_key must be set together")
		}
		cert, err := tls.LoadX509KeyPair(cfg.SSLCert, cfg.SSLKey)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to load ssl_cert/ssl_key pair")
		}
		certs = []tls.Certificate{cert}
	}

	serverName := ""
	if u, err := url.Parse(cfg.DSN); err == nil {
		serverName = u.Hostname()
	}

	return &tls.Config{
		RootCAs:      pool,
		Certificates: certs,
		ServerName:   serverName,
		MinVersion:   tls.VersionTLS12,
	}, nil
}

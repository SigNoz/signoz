package basemigrator

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz-otel-collector/migrationmanager/migrators"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/clickhouse"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"go.uber.org/zap"
)

type BaseMigrator struct {
	Cfg    migrators.MigratorConfig
	Logger *zap.Logger
	DB     driver.Conn
}

func New(cfg migrators.MigratorConfig, logger *zap.Logger) (*BaseMigrator, error) {
	dbConn, err := createClickhouseConnection(cfg.DSN)
	if err != nil {
		logger.Error("Failed to create clickhouse connection", zap.Error(err))
		return nil, err
	}

	return &BaseMigrator{
		Cfg:    cfg,
		Logger: logger,
		DB:     dbConn,
	}, nil
}

func (m *BaseMigrator) Migrate(ctx context.Context, database string, migrationFolder string) error {
	err := m.createDB(ctx, database)
	if err != nil {
		return err
	}

	return m.runSqlMigrations(ctx, migrationFolder, database)
}

func (m *BaseMigrator) Close() error {
	return m.DB.Close()
}

func (m *BaseMigrator) createDB(ctx context.Context, database string) error {
	q := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s ON CLUSTER %s;", database, m.Cfg.ClusterName)
	err := m.DB.Exec(ctx, q)
	if err != nil {
		return fmt.Errorf("failed to create database, err: %s", err)
	}
	return nil
}

func (m *BaseMigrator) dropSchemaMigrationsTable(ctx context.Context, database string) error {
	err := m.DB.Exec(ctx, fmt.Sprintf(`DROP TABLE IF EXISTS %s.%s ON CLUSTER %s;`, database, "schema_migrations", m.Cfg.ClusterName))
	if err != nil {
		return fmt.Errorf("error dropping schema_migrations table: %v", err)
	}
	return nil
}

func (m *BaseMigrator) runSqlMigrations(ctx context.Context, migrationFolder, database string) error {
	clickhouseUrl, err := m.buildClickhouseMigrateURL(database)
	if err != nil {
		return fmt.Errorf("failed to build clickhouse migrate url, err: %s", err)
	}
	migrator, err := migrate.New("file://"+migrationFolder, clickhouseUrl)
	if err != nil {
		return fmt.Errorf("failed to create migrator, err: %s", err)
	}
	migrator.Log = newZapLoggerAdapter(m.Logger, m.Cfg.VerboseLoggingEnabled)
	migrator.EnableTemplating = true

	err = migrator.Up()
	if err != nil && !strings.HasSuffix(err.Error(), "no change") {
		return fmt.Errorf("clickhouse migrate failed to run, error: %s", err)
	}
	return nil
}

func (m *BaseMigrator) buildClickhouseMigrateURL(database string) (string, error) {
	var clickhouseUrl string
	parsedURL, err := url.Parse(m.Cfg.DSN)
	if err != nil {
		return "", err
	}
	host := parsedURL.Host
	if host == "" {
		return "", fmt.Errorf("unable to parse host")

	}
	paramMap, err := url.ParseQuery(parsedURL.RawQuery)
	if err != nil {
		return "", err
	}
	username := paramMap["username"]
	password := paramMap["password"]

	if len(username) > 0 && len(password) > 0 {
		clickhouseUrl = fmt.Sprintf("clickhouse://%s:%s@%s/%s?x-multi-statement=true&x-cluster-name=%s&x-migrations-table=schema_migrations&x-migrations-table-engine=MergeTree", username[0], password[0], host, database, m.Cfg.ClusterName)
	} else {
		clickhouseUrl = fmt.Sprintf("clickhouse://%s/%s?x-multi-statement=true&x-cluster-name=%s&x-migrations-table=schema_migrations&x-migrations-table-engine=MergeTree", host, database, m.Cfg.ClusterName)
	}
	return clickhouseUrl, nil
}

func createClickhouseConnection(dsn string) (driver.Conn, error) {
	dsnURL, err := url.Parse(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse dsn: %w", err)
	}
	options := &clickhouse.Options{
		Addr: []string{dsnURL.Host},
	}
	if dsnURL.Query().Get("username") != "" {
		auth := clickhouse.Auth{
			Username: dsnURL.Query().Get("username"),
			Password: dsnURL.Query().Get("password"),
		}
		options.Auth = auth
	}
	db, err := clickhouse.Open(options)
	if err != nil {
		return nil, fmt.Errorf("failed to open clickhouse connection: %w", err)
	}

	if err := db.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping clickhouse: %w", err)
	}

	return db, nil
}

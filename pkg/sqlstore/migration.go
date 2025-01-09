package sqlstore

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

type Migration interface {
	Register(*migrate.Migrations) error
	Up(context.Context, *bun.DB) error
	Down(context.Context, *bun.DB) error
}

type MigrationConfig struct {
	Logger *zap.Logger
}

// NewMigrationFunc is a function that creates a new migration.
type NewMigrationFunc = func(MigrationConfig) Migration

// MigrationFactory is a factory that creates a new migration.
type MigrationFactory interface {
	New(MigrationConfig) Migration
}

// NewMigrationFactory creates a new migration factory.
func NewMigrationFactory(f NewMigrationFunc) MigrationFactory {
	return &migrationFactory{f: f}
}

// migrationFactory is a factory that implements the MigrationFactory interface.
type migrationFactory struct {
	f NewMigrationFunc
}

// New creates a new migration.
func (factory *migrationFactory) New(config MigrationConfig) Migration {
	return factory.f(config)
}

package integrations

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func InitSqliteDBIfNeeded(db *sqlx.DB) error {
	if db == nil {
		return fmt.Errorf("db is required.")
	}

	createTablesStatements := `
		CREATE TABLE IF NOT EXISTS integrations_installed(
			id TEXT PRIMARY KEY,
			data TEXT,
			installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`
	_, err := db.Exec(createTablesStatements)
	if err != nil {
		return fmt.Errorf("could not ensure integrations schema in sqlite DB: %w", err)
	}

	return nil
}

type InstalledIntegrationsSqliteRepo struct {
	db *sqlx.DB
}

func NewInstalledIntegrationsSqliteRepo(db *sqlx.DB) (
	*InstalledIntegrationsSqliteRepo, error,
) {
	err := InitSqliteDBIfNeeded(db)
	if err != nil {
		return nil, fmt.Errorf("couldn't ensure sqlite schema for installed integrations: %w", err)
	}

	return &InstalledIntegrationsSqliteRepo{
		db: db,
	}, nil
}

func (r *InstalledIntegrationsSqliteRepo) list(
	ctx context.Context,
) ([]InstalledIntegration, *model.ApiError) {
	return []InstalledIntegration{}, nil
}

func (r *InstalledIntegrationsSqliteRepo) get(
	ctx context.Context, ids []string,
) (map[string]InstalledIntegration, *model.ApiError) {
	integrations := []InstalledIntegration{}

	idPlaceholders := []string{}
	idValues := []interface{}{}
	for _, id := range ids {
		idPlaceholders = append(idPlaceholders, "?")
		idValues = append(idValues, id)
	}

	err := r.db.GetContext(ctx, &integrations, fmt.Sprintf(`
		select
			data
			installed_at
		from integrations_installed
		where id in (%s)`, strings.Join(idPlaceholders, ", ")),
		idValues...,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query installed integrations: %w", err,
		))
	}

	result := map[string]InstalledIntegration{}
	for _, ii := range integrations {
		result[ii.Id] = ii
	}

	return result, nil
}

func (r *InstalledIntegrationsSqliteRepo) upsert(
	ctx context.Context, integration IntegrationDetails,
) (*InstalledIntegration, *model.ApiError) {
	integrationJson, err := json.Marshal(integration)
	if err != nil {
		return nil, model.BadRequest(err)
	}

	_, dbErr := r.db.ExecContext(
		ctx, `
			INSERT INTO integrations_installed (
				id,
				data
			) values ($1, $2)
			on conflict(id) do update set data=excluded.data
		`, integration.Id, string(integrationJson),
	)
	if dbErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not insert record for integration installation: %w", dbErr,
		))
	}

	res, apiErr := r.get(ctx, []string{integration.Id})
	if apiErr != nil || len(res) < 1 {
		return nil, model.WrapApiError(apiErr, "could not fetch installed integration")
	}

	installed := res[integration.Id]

	return &installed, nil
}

func (r *InstalledIntegrationsSqliteRepo) delete(
	ctx context.Context, integrationId string,
) *model.ApiError {
	return nil
}

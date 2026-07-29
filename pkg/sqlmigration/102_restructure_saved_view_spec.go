package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type restructureSavedViewSpec struct {
	store sqlstore.SQLStore
}

func NewRestructureSavedViewSpecFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("restructure_saved_view_spec"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &restructureSavedViewSpec{store: store}, nil
	})
}

func (migration *restructureSavedViewSpec) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// legacySavedViewCompositeQuery is the bare shape saved_views.data held
// before this migration -- just the composite query, no schemaVersion/spec
// envelope. Queries is kept as raw JSON since the migration only needs to
// relocate it, not interpret it.
type legacySavedViewCompositeQuery struct {
	PanelType string          `json:"panelType"`
	Queries   json.RawMessage `json:"queries"`
}

// legacySavedViewExtraData mirrors the frontend's ad hoc extraData JSON shape
// (frontend/src/container/ExplorerOptions/ExplorerOptions.tsx).
type legacySavedViewExtraData struct {
	Color         string          `json:"color,omitempty"`
	SelectColumns json.RawMessage `json:"selectColumns,omitempty"`
	Format        string          `json:"format,omitempty"`
	MaxLines      int             `json:"maxLines,omitempty"`
	FontSize      string          `json:"fontSize,omitempty"`
}

type savedViewDisplay struct {
	MaxLines int    `json:"maxLines,omitempty"`
	FontSize string `json:"fontSize,omitempty"`
	Format   string `json:"format,omitempty"`
	Color    string `json:"color,omitempty"`
}

type savedViewSpec struct {
	PanelType      string           `json:"panelType"`
	Queries        json.RawMessage  `json:"queries"`
	SelectedFields json.RawMessage  `json:"selectedFields,omitempty"`
	Display        savedViewDisplay `json:"display,omitzero"`
}

type savedViewData struct {
	SchemaVersion string        `json:"schemaVersion"`
	Spec          savedViewSpec `json:"spec"`
}

func (migration *restructureSavedViewSpec) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var savedViews []struct {
		ID        string `bun:"id"`
		Data      string `bun:"data"`
		ExtraData string `bun:"extra_data"`
	}

	err = tx.NewSelect().
		Table("saved_views").
		Column("id", "data", "extra_data").
		Scan(ctx, &savedViews)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	for _, savedView := range savedViews {
		var compositeQuery legacySavedViewCompositeQuery
		if err := json.Unmarshal([]byte(savedView.Data), &compositeQuery); err != nil {
			continue // invalid/empty JSON -- leave the row alone rather than fail the whole migration
		}

		var extraData legacySavedViewExtraData
		if savedView.ExtraData != "" {
			// Best-effort: malformed/older extraData shapes never fail the
			// migration, they just leave selectedFields/display empty.
			_ = json.Unmarshal([]byte(savedView.ExtraData), &extraData)
		}

		dataJSON, err := json.Marshal(savedViewData{
			SchemaVersion: "v2",
			Spec: savedViewSpec{
				PanelType:      compositeQuery.PanelType,
				Queries:        compositeQuery.Queries,
				SelectedFields: extraData.SelectColumns,
				Display: savedViewDisplay{
					MaxLines: extraData.MaxLines,
					FontSize: extraData.FontSize,
					Format:   extraData.Format,
					Color:    extraData.Color,
				},
			},
		})
		if err != nil {
			return err
		}

		_, err = tx.NewUpdate().
			Table("saved_views").
			Set("data = ?", string(dataJSON)).
			Where("id = ?", savedView.ID).
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	for _, column := range []string{"extra_data", "category", "tags"} {
		if err := migration.store.Dialect().DropColumn(ctx, tx, "saved_views", column); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *restructureSavedViewSpec) Down(context.Context, *bun.DB) error {
	// this migration is not reversible as we're transforming the structure
	return nil
}

package sqlmigration

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"strings"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type restructureSavedViewSpec struct {
	store     sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewRestructureSavedViewSpecFactory(store sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("restructure_saved_view_spec"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &restructureSavedViewSpec{store: store, sqlschema: sqlschema}, nil
	})
}

func (migration *restructureSavedViewSpec) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// legacySavedViewCompositeQuery is the bare shape saved_view.data held
// before this migration -- just the relevant fields of composite query.
// Queries is kept as raw JSON since the migration only needs to relocate it, not interpret it.
type legacySavedViewCompositeQuery struct {
	PanelType string          `json:"panelType"`
	Queries   json.RawMessage `json:"queries"`
}

// legacySavedViewExtraData mirrors the frontend defined extraData JSON shape.
type legacySavedViewExtraData struct {
	Color         string          `json:"color,omitempty"`
	SelectColumns json.RawMessage `json:"selectColumns,omitempty"`
	Format        string          `json:"format,omitempty"`
	MaxLines      int             `json:"maxLines,omitempty"`
	FontSize      string          `json:"fontSize,omitempty"`
}

type savedViewDisplay struct {
	MaxLines int    `json:"maxLines"`
	FontSize string `json:"fontSize"`
	Format   string `json:"format"`
	Color    string `json:"color"`
}

type savedViewSpec struct {
	DisplayName    string           `json:"displayName"`
	PanelType      string           `json:"panelType"`
	Queries        json.RawMessage  `json:"queries"`
	SelectedFields json.RawMessage  `json:"selectedFields"`
	Display        savedViewDisplay `json:"display"`
}

type savedViewData struct {
	SchemaVersion string        `json:"schemaVersion"`
	Spec          savedViewSpec `json:"spec"`
}

const migrationSavedViewNameSuffixLen = 8

// slugifySavedViewName turns a pre-existing free-text saved view name and is copy of
// dashboardtypes.generateDashboardName.
func slugifySavedViewName(displayName string) string {
	const dns1123LabelMaxLen = 63
	suffixAlphabet := []byte("abcdefghijklmnopqrstuvwxyz0123456789")

	var b strings.Builder
	b.Grow(len(displayName))
	prevHyphen := false
	for _, r := range strings.ToLower(displayName) {
		switch {
		case (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'):
			b.WriteRune(r)
			prevHyphen = false
		case b.Len() > 0 && !prevHyphen:
			b.WriteByte('-')
			prevHyphen = true
		}
	}
	prefix := strings.TrimRight(b.String(), "-")

	suffix := make([]byte, migrationSavedViewNameSuffixLen)
	if _, err := rand.Read(suffix); err != nil {
		panic(err)
	}
	for i := range suffix {
		suffix[i] = suffixAlphabet[int(suffix[i])%len(suffixAlphabet)]
	}

	maxPrefix := dns1123LabelMaxLen - 1 - migrationSavedViewNameSuffixLen
	if len(prefix) > maxPrefix {
		prefix = strings.TrimRight(prefix[:maxPrefix], "-")
	}
	if prefix == "" {
		return string(suffix)
	}
	return prefix + "-" + string(suffix)
}

func (migration *restructureSavedViewSpec) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var savedViews []struct {
		ID        string `bun:"id"`
		Name      string `bun:"name"`
		Data      string `bun:"data"`
		ExtraData string `bun:"extra_data"`
	}

	err = tx.NewSelect().
		Table("saved_views").
		Column("id", "name", "data", "extra_data").
		Scan(ctx, &savedViews)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	for _, savedView := range savedViews {
		var compositeQuery legacySavedViewCompositeQuery
		if err := json.Unmarshal([]byte(savedView.Data), &compositeQuery); err != nil {
			continue // skip the row on error rather than fail the whole migration
		}

		var extraData legacySavedViewExtraData
		if savedView.ExtraData != "" {
			// best-effort: malformed/older extraData shapes never fail the migration,
			// they just leave selectedFields/display empty.
			_ = json.Unmarshal([]byte(savedView.ExtraData), &extraData)
		}

		dataJSON, err := json.Marshal(savedViewData{
			SchemaVersion: "v2",
			Spec: savedViewSpec{
				DisplayName:    savedView.Name,
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

		// Existing names were free text (no slug constraints); the free-text
		// value is preserved verbatim as data.spec.displayName above, and name is
		// replaced with a fresh slug so it satisfies the new DNS-1123 + (org_id,
		// name) uniqueness rules below.
		_, err = tx.NewUpdate().
			Table("saved_views").
			Set("data = ?, name = ?", string(dataJSON), slugifySavedViewName(savedView.Name)).
			Where("id = ?", savedView.ID).
			Exec(ctx)
		if err != nil {
			return err
		}
	}

	for _, column := range []string{"category", "tags"} {
		if err := migration.store.Dialect().DropColumn(ctx, tx, "saved_views", column); err != nil {
			return err
		}
	}

	if _, err := migration.store.Dialect().RenameColumn(ctx, tx, "saved_views", "source_page", "source"); err != nil {
		return err
	}

	// matching the singular table-name convention.
	if _, err := tx.ExecContext(ctx, "ALTER TABLE saved_views RENAME TO saved_view"); err != nil {
		return err
	}

	for _, sql := range migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   "saved_view",
		ColumnNames: []sqlschema.ColumnName{"org_id", "name"},
	}) {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *restructureSavedViewSpec) Down(context.Context, *bun.DB) error {
	// this migration is not reversible as we're transforming the structure
	return nil
}

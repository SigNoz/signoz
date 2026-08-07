package sqlmigration

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"strings"
	"time"

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

// storableLegacySavedView is the shape of the `saved_views` table before this migration.
type storableLegacySavedView struct {
	bun.BaseModel `bun:"table:saved_views"`

	ID         string    `bun:"id"`
	Name       string    `bun:"name"`
	SourcePage string    `bun:"source_page"`
	Data       string    `bun:"data"`
	ExtraData  string    `bun:"extra_data"`
	OrgID      string    `bun:"org_id"`
	CreatedAt  time.Time `bun:"created_at"`
	UpdatedAt  time.Time `bun:"updated_at"`
	CreatedBy  string    `bun:"created_by"`
	UpdatedBy  string    `bun:"updated_by"`
}

// storableSavedView is the shape of the `saved_view` table this migration creates.
type storableSavedView struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID        string    `bun:"id,pk,type:text"`
	OrgID     string    `bun:"org_id,type:text,notnull"`
	Name      string    `bun:"name,type:text,notnull"`
	Source    string    `bun:"source,type:text,notnull"`
	Data      string    `bun:"data,type:text,notnull"`
	CreatedAt time.Time `bun:"created_at,notnull"`
	UpdatedAt time.Time `bun:"updated_at,notnull"`
	CreatedBy string    `bun:"created_by,type:text,notnull"`
	UpdatedBy string    `bun:"updated_by,type:text,notnull"`
}

func (migration *restructureSavedViewSpec) Up(ctx context.Context, db *bun.DB) error {
	// check if the `saved_view` table already exists
	if _, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("saved_view")); err == nil {
		return nil
	}

	savedViewsTable, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("saved_views"))
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var oldSavedViews []*storableLegacySavedView
	if err := tx.NewSelect().Model(&oldSavedViews).Scan(ctx); err != nil && err != sql.ErrNoRows {
		return err
	}

	// drop table `saved_views`
	for _, sql := range migration.sqlschema.Operator().DropTable(savedViewsTable) {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// create table `saved_view` with the final required schema
	for _, sql := range migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "saved_view",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "source", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "data", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("org_id"),
				ReferencedTableName:   sqlschema.TableName("organizations"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	}) {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// convert old saved views to the new shape
	newSavedViews := make([]*storableSavedView, 0, len(oldSavedViews))
	for _, old := range oldSavedViews {
		if old.OrgID == "" {
			continue // orphaned row from a pre-existing org_id backfill gap; nothing sane to attach it to
		}

		var compositeQuery legacySavedViewCompositeQuery
		if err := json.Unmarshal([]byte(old.Data), &compositeQuery); err != nil {
			continue // skip the row on error rather than fail the whole migration
		}

		var extraData legacySavedViewExtraData
		if old.ExtraData != "" {
			// best-effort: malformed/older extraData shapes never fail the migration,
			// they just leave selectedFields/display empty.
			_ = json.Unmarshal([]byte(old.ExtraData), &extraData)
		}

		dataJSON, err := json.Marshal(savedViewData{
			SchemaVersion: "v2",
			Spec: savedViewSpec{
				DisplayName:    old.Name,
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
		// name) uniqueness rules.
		newSavedViews = append(newSavedViews, &storableSavedView{
			ID:        old.ID,
			OrgID:     old.OrgID,
			Name:      slugifySavedViewName(old.Name),
			Source:    old.SourcePage,
			Data:      string(dataJSON),
			CreatedAt: old.CreatedAt,
			UpdatedAt: old.UpdatedAt,
			CreatedBy: old.CreatedBy,
			UpdatedBy: old.UpdatedBy,
		})
	}

	if len(newSavedViews) > 0 {
		if _, err := tx.NewInsert().Model(&newSavedViews).Exec(ctx); err != nil {
			return err
		}
	}

	// add unique index on (org_id, name)
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

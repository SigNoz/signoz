package sqlmigration

import (
	"context"
	"crypto/rand"
	"strings"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addChannelDisplayName struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddChannelDisplayNameFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("channel_display_name"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addChannelDisplayName{sqlstore: sqlstore, sqlschema: sqlschema}, nil
		},
	)
}

func (migration *addChannelDisplayName) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up moves the free-text name onto display_name and gives name the DNS1123
// identity, matching organizations and dashboards. Nothing outside the channel
// reads the new name yet: routing policies and rules still reference
// display_name, and the alertmanager config still keys receivers by that same
// string.
func (migration *addChannelDisplayName) Up(ctx context.Context, db *bun.DB) error {
	// Adding a NOT NULL column rebuilds the whole table on SQLite (create temp,
	// copy, drop, rename), and notification_channel has a foreign key on org_id
	// that the copy would re-validate. Enforcement stays off for the rebuild.
	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("notification_channel"))
	if err != nil {
		return err
	}

	if _, err := migration.sqlstore.Dialect().RenameColumn(ctx, tx, "notification_channel", "name", "display_name"); err != nil {
		return err
	}

	// The table was inspected before the rename, and the recreate-table fallback
	// below rebuilds the table from this description, so it has to follow.
	for _, column := range table.Columns {
		if column.Name == sqlschema.ColumnName("name") {
			column.Name = sqlschema.ColumnName("display_name")
		}
	}

	nameColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("name"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, nameColumn, "")
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	type channel struct {
		bun.BaseModel `bun:"table:notification_channel"`
		ID            valuer.UUID `bun:"id,pk"`
		DisplayName   string      `bun:"display_name"`
	}

	// Only rows the column add left empty are backfilled, so a retry after a
	// partial run does not hand already-named channels a fresh random suffix.
	var channels []channel
	if err := tx.
		NewSelect().
		Model(&channels).
		Column("id", "display_name").
		Where("name = ?", "").
		Scan(ctx); err != nil {
		return err
	}

	for _, existing := range channels {
		if _, err := tx.
			NewUpdate().
			Model((*channel)(nil)).
			Set("name = ?", slugifyChannelName(existing.DisplayName)).
			Where("id = ?", existing.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   "notification_channel",
		ColumnNames: []sqlschema.ColumnName{"org_id", "name"},
	})
	for _, sql := range indexSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return migration.sqlschema.ToggleFKEnforcement(ctx, db, true)
}

func (migration *addChannelDisplayName) Down(context.Context, *bun.DB) error {
	return nil
}

const migrationChannelNameSuffixLen = 8

// slugifyChannelName is a copy of dashboardtypes.generateDashboardName. The
// random suffix is what makes the unique index safe to add without a collision
// loop over the existing free-text names.
func slugifyChannelName(displayName string) string {
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

	suffix := make([]byte, migrationChannelNameSuffixLen)
	if _, err := rand.Read(suffix); err != nil {
		panic(err)
	}
	for i := range suffix {
		suffix[i] = suffixAlphabet[int(suffix[i])%len(suffixAlphabet)]
	}

	maxPrefix := dns1123LabelMaxLen - 1 - migrationChannelNameSuffixLen
	if len(prefix) > maxPrefix {
		prefix = strings.TrimRight(prefix[:maxPrefix], "-")
	}
	if prefix == "" {
		return string(suffix)
	}
	return prefix + "-" + string(suffix)
}

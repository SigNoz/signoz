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

type addChannelInternalName struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddChannelInternalNameFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("channel_internal_name"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addChannelInternalName{sqlstore: sqlstore, sqlschema: sqlschema}, nil
		},
	)
}

func (migration *addChannelInternalName) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up adds the DNS1123 identity alongside the free-text name. Nothing outside the
// channel reads it yet: routing policies and rules still reference the name
// column, and the alertmanager config still keys receivers by that same string.
func (migration *addChannelInternalName) Up(ctx context.Context, db *bun.DB) error {
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

	internalNameColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("internal_name"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, internalNameColumn, "")
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	type channel struct {
		bun.BaseModel `bun:"table:notification_channel"`
		ID            valuer.UUID `bun:"id,pk"`
		Name          string      `bun:"name"`
	}

	var channels []channel
	if err := tx.
		NewSelect().
		Model(&channels).
		Column("id", "name").
		Scan(ctx); err != nil {
		return err
	}

	for _, existing := range channels {
		if _, err := tx.
			NewUpdate().
			Model((*channel)(nil)).
			Set("internal_name = ?", slugifyChannelName(existing.Name)).
			Where("id = ?", existing.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   "notification_channel",
		ColumnNames: []sqlschema.ColumnName{"org_id", "internal_name"},
	})
	for _, sql := range indexSQLs {
		if _, err := db.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return nil
}

func (migration *addChannelInternalName) Down(context.Context, *bun.DB) error {
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

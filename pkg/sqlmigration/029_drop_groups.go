package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type dropGroups struct {
	sqlstore sqlstore.SQLStore
}

func NewDropGroupsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop_groups"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newDropGroups(ctx, providerSettings, config, sqlstore)
	})
}

func newDropGroups(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &dropGroups{sqlstore: sqlstore}, nil
}

func (migration *dropGroups) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *dropGroups) Up(ctx context.Context, db *bun.DB) error {
	type Group struct {
		bun.BaseModel `bun:"table:groups"`

		types.TimeAuditable
		OrgID string `bun:"org_id,type:text"`
		ID    string `bun:"id,pk,type:text" json:"id"`
		Name  string `bun:"name,type:text,notnull,unique" json:"name"`
	}

	exists, err := migration.sqlstore.Dialect().TableExists(ctx, db, new(Group))
	if err != nil {
		return err
	}

	if !exists {
		return nil
	}

	// Disable foreign keys temporarily
	if err := migration.sqlstore.Dialect().ToggleForeignKeyConstraint(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	type existingUser struct {
		bun.BaseModel `bun:"table:users"`

		types.TimeAuditable
		ID                string `bun:"id,pk,type:text" json:"id"`
		Name              string `bun:"name,type:text,notnull" json:"name"`
		Email             string `bun:"email,type:text,notnull,unique" json:"email"`
		Password          string `bun:"password,type:text,notnull" json:"-"`
		ProfilePictureURL string `bun:"profile_picture_url,type:text" json:"profilePictureURL"`
		GroupID           string `bun:"group_id,type:text,notnull" json:"groupId"`
		OrgID             string `bun:"org_id,type:text,notnull" json:"orgId"`
	}

	var existingUsers []*existingUser
	if err := tx.
		NewSelect().
		Model(&existingUsers).
		Scan(ctx); err != nil {
		return err
	}

	var groups []*Group
	if err := tx.
		NewSelect().
		Model(&groups).
		Scan(ctx); err != nil {
		return err
	}

	groupIDToRoleMap := make(map[string]string)
	for _, group := range groups {
		groupIDToRoleMap[group.ID] = group.Name
	}

	roleToUserIDMap := make(map[string][]string)
	for _, user := range existingUsers {
		roleToUserIDMap[groupIDToRoleMap[user.GroupID]] = append(roleToUserIDMap[groupIDToRoleMap[user.GroupID]], user.ID)
	}

	if err := migration.sqlstore.Dialect().DropColumnWithForeignKeyConstraint(ctx, tx, new(struct {
		bun.BaseModel `bun:"table:users"`

		types.TimeAuditable
		ID                string `bun:"id,pk,type:text"`
		Name              string `bun:"name,type:text,notnull"`
		Email             string `bun:"email,type:text,notnull,unique"`
		Password          string `bun:"password,type:text,notnull"`
		ProfilePictureURL string `bun:"profile_picture_url,type:text"`
		OrgID             string `bun:"org_id,type:text,notnull"`
	}), "group_id"); err != nil {
		return err
	}

	if err := migration.sqlstore.Dialect().AddColumn(ctx, tx, "users", "role", "TEXT"); err != nil {
		return err
	}

	for role, userIDs := range roleToUserIDMap {
		if _, err := tx.
			NewUpdate().
			Table("users").
			Set("role = ?", role).
			Where("id IN (?)", bun.In(userIDs)).
			Exec(ctx); err != nil {
			return err
		}
	}

	if err := migration.sqlstore.Dialect().AddNotNullDefaultToColumn(ctx, tx, "users", "role", "TEXT", "'VIEWER'"); err != nil {
		return err
	}

	if _, err := tx.
		NewDropTable().
		Table("groups").
		IfExists().
		Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// Enable foreign keys
	if err := migration.sqlstore.Dialect().ToggleForeignKeyConstraint(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *dropGroups) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

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
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback()

	type Group struct {
		bun.BaseModel `bun:"table:groups"`

		types.TimeAuditable
		OrgID string `bun:"org_id,type:text"`
		ID    string `bun:"id,pk,type:text" json:"id"`
		Name  string `bun:"name,type:text,notnull,unique" json:"name"`
	}

	var groups []*Group
	if err := tx.NewSelect().Model(&groups).Scan(ctx); err != nil {
		return err
	}

	groupIDToRoleMap := make(map[string]string)
	for _, group := range groups {
		groupIDToRoleMap[group.ID] = group.Name
	}

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

	type newUser struct {
		bun.BaseModel `bun:"table:new_users"`

		types.TimeAuditable
		ID                string `bun:"id,pk,type:text" json:"id"`
		Name              string `bun:"name,type:text,notnull" json:"name"`
		Email             string `bun:"email,type:text,notnull,unique" json:"email"`
		Password          string `bun:"password,type:text,notnull" json:"-"`
		ProfilePictureURL string `bun:"profile_picture_url,type:text" json:"profilePictureURL"`
		Role              string `bun:"role,type:text,notnull" json:"role"`
		OrgID             string `bun:"org_id,type:text,notnull" json:"orgId"`
	}

	migration.sqlstore.Dialect().RenameTableAndModifyModel(ctx, tx, new(existingUser), new(newUser), []string{OrgReference}, func(ctx context.Context) error {
		var existingUsers []*existingUser
		if err := tx.NewSelect().Model(&existingUsers).Scan(ctx); err != nil {
			return err
		}

		newUsers := make([]*newUser, 0)
		for _, user := range existingUsers {
			newUsers = append(newUsers, &newUser{
				ID:                user.ID,
				Name:              user.Name,
				Email:             user.Email,
				Password:          user.Password,
				ProfilePictureURL: user.ProfilePictureURL,
				Role:              groupIDToRoleMap[user.GroupID],
				OrgID:             user.OrgID,
			})
		}

		if len(newUsers) > 0 {
			if _, err := tx.NewInsert().Model(&newUsers).Exec(ctx); err != nil {
				return err
			}
		}

		return nil
	})

	if _, err := tx.ExecContext(ctx, "ALTER TABLE new_users RENAME TO users"); err != nil {
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

	return nil
}

func (migration *dropGroups) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

package sqlmigration

import (
	"context"
	"database/sql"
	"fmt"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addTimestamptz struct {
	store sqlstore.SQLStore
}

type identifiable33 struct {
	ID valuer.UUID `json:"id" bun:"id,pk,type:text"`
}

type existingTimeAuditable33 struct {
	CreatedAt time.Time `bun:"created_at" json:"createdAt"`
	UpdatedAt time.Time `bun:"updated_at" json:"updatedAt"`
}

type newTimeAuditable33 struct {
	CreatedAt time.Time `bun:"created_at,type:timestamptz,nullzero" json:"createdAt"`
	UpdatedAt time.Time `bun:"updated_at,type:timestamptz,nullzero" json:"updatedAt"`
}

type existingOrganization33 struct {
	bun.BaseModel `bun:"table:organizations"`
	existingTimeAuditable33
	identifiable33
	Name        string `bun:"name,type:text,nullzero" json:"name"`
	Alias       string `bun:"alias,type:text,nullzero" json:"alias"`
	DisplayName string `bun:"display_name,type:text,notnull" json:"displayName"`
}

type newOrganization33 struct {
	bun.BaseModel `bun:"table:organizations_tmp"`
	newTimeAuditable33
	identifiable33
	Name        string `bun:"name,type:text,nullzero" json:"name"`
	Alias       string `bun:"alias,type:text,nullzero" json:"alias"`
	DisplayName string `bun:"display_name,type:text,notnull" json:"displayName"`
}

type existingUser33 struct {
	bun.BaseModel `bun:"table:users"`

	identifiable33
	existingTimeAuditable33
	DisplayName string `bun:"display_name,type:text,notnull" json:"displayName"`
	Email       string `bun:"email,type:text,notnull,unique:org_email" json:"email"`
	Role        string `bun:"role,type:text,notnull" json:"role"`
	OrgID       string `bun:"org_id,type:text,notnull,unique:org_email,references:org(id),on_delete:CASCADE" json:"orgId"`
}

type newUser33 struct {
	bun.BaseModel `bun:"table:users_tmp"`

	identifiable33
	newTimeAuditable33
	DisplayName string `bun:"display_name,type:text,notnull" json:"displayName"`
	Email       string `bun:"email,type:text,notnull,unique:org_email" json:"email"`
	Role        string `bun:"role,type:text,notnull" json:"role"`
	OrgID       string `bun:"org_id,type:text,notnull,unique:org_email,references:org(id),on_delete:CASCADE" json:"orgId"`
}

func NewAddTimestamptzFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_timestamptz"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newAddTimestamptz(ctx, ps, c, sqlstore)
	})
}

func newAddTimestamptz(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &addTimestamptz{store: store}, nil
}

func (migration *addTimestamptz) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addTimestamptz) Up(ctx context.Context, db *bun.DB) error {
	err := migration.store.Dialect().ToggleForeignKeyConstraint(ctx, db, false)
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	organizations := make([]*existingOrganization33, 0)
	newOrganizations := make([]*newOrganization33, 0)
	err = tx.NewSelect().Model(&organizations).Scan(ctx)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	for _, organization := range organizations {
		if organization.CreatedAt.IsZero() {
			organization.CreatedAt = time.Now()
		}
		if organization.UpdatedAt.IsZero() {
			organization.UpdatedAt = time.Now()
		}
		newOrganizations = append(newOrganizations, &newOrganization33{
			newTimeAuditable33: newTimeAuditable33{
				CreatedAt: organization.CreatedAt,
				UpdatedAt: organization.UpdatedAt,
			},
			identifiable33: identifiable33{
				ID: organization.ID,
			},
			Name:        organization.Name,
			Alias:       organization.Alias,
			DisplayName: organization.DisplayName,
		})

	}

	_, err = tx.NewCreateTable().IfNotExists().Model(new(newOrganization33)).Exec(ctx)
	if err != nil {
		return err
	}

	if len(newOrganizations) > 0 {
		_, err = tx.NewInsert().Model(&newOrganizations).Exec(ctx)
		if err != nil {
			return err
		}
	}

	_, err = tx.NewDropTable().Model(new(existingOrganization33)).IfExists().Exec(ctx)
	if err != nil {
		return err
	}

	oldTableName := tx.Dialect().Tables().Get(reflect.TypeOf(new(existingOrganization33))).Name
	_, err = tx.
		ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", oldTableName+"_tmp", oldTableName))
	if err != nil {
		return err
	}

	/// ---

	users := make([]*existingUser33, 0)
	newUsers := make([]*newUser33, 0)
	err = tx.NewSelect().Model(&users).Scan(ctx)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	for _, user := range users {
		if user.CreatedAt.IsZero() {
			user.CreatedAt = time.Now()
		}
		if user.UpdatedAt.IsZero() {
			user.UpdatedAt = time.Now()
		}
		newUsers = append(newUsers, &newUser33{
			newTimeAuditable33: newTimeAuditable33{
				CreatedAt: user.CreatedAt,
				UpdatedAt: user.UpdatedAt,
			},
			identifiable33: identifiable33{
				ID: user.ID,
			},
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Role:        user.Role,
			OrgID:       user.OrgID,
		})

	}

	_, err = tx.NewCreateTable().IfNotExists().Model(new(newUser33)).Exec(ctx)
	if err != nil {
		return err
	}

	if len(newUsers) > 0 {
		_, err = tx.NewInsert().Model(&newUsers).Exec(ctx)
		if err != nil {
			return err
		}
	}

	_, err = tx.NewDropTable().Model(new(existingUser33)).IfExists().Exec(ctx)
	if err != nil {
		return err
	}

	oldTableName = tx.Dialect().Tables().Get(reflect.TypeOf(new(existingUser33))).Name
	_, err = tx.
		ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", oldTableName+"_tmp", oldTableName))
	if err != nil {
		return err
	}

	defer tx.Rollback()

	err = tx.Commit()
	if err != nil {
		return err
	}

	err = migration.store.Dialect().ToggleForeignKeyConstraint(ctx, db, true)
	if err != nil {
		return err
	}
	return nil
}

func (migration *addTimestamptz) Down(context.Context, *bun.DB) error {
	return nil
}

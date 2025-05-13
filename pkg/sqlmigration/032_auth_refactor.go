package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type authRefactor struct {
	store sqlstore.SQLStore
}

func NewAuthRefactorFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("auth_refactor"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newAuthRefactor(ctx, ps, c, sqlstore)
	})
}

func newAuthRefactor(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &authRefactor{store: store}, nil
}

func (migration *authRefactor) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

type existingUser32 struct {
	bun.BaseModel `bun:"table:users"`

	types.TimeAuditable
	ID                string `bun:"id,pk,type:text" json:"id"`
	Name              string `bun:"name,type:text,notnull" json:"name"`
	Email             string `bun:"email,type:text,notnull,unique" json:"email"`
	Password          string `bun:"password,type:text,notnull" json:"-"`
	ProfilePictureURL string `bun:"profile_picture_url,type:text" json:"profilePictureURL"`
	Role              string `bun:"role,type:text,notnull" json:"role"`
	OrgID             string `bun:"org_id,type:text,notnull" json:"orgId"`
}

type FactorPassword32 struct {
	bun.BaseModel `bun:"table:factor_password"`

	types.Identifiable
	types.TimeAuditable
	Password  string `bun:"password,type:text,notnull" json:"password"`
	Temporary bool   `bun:"temporary,type:boolean,notnull" json:"temporary"`
	UserID    string `bun:"user_id,type:text,notnull,unique,references:user(id)" json:"userId"`
}

type existingResetPasswordRequest32 struct {
	bun.BaseModel `bun:"table:reset_password_request"`

	types.Identifiable
	Token  string `bun:"token,type:text,notnull" json:"token"`
	UserID string `bun:"user_id,type:text,notnull,unique" json:"userId"`
}

type FactorResetPasswordRequest32 struct {
	bun.BaseModel `bun:"table:factor_reset_password_request"`

	types.Identifiable
	Token      string `bun:"token,type:text,notnull" json:"token"`
	PasswordID string `bun:"password_id,type:text,notnull,unique,references:factor_password(id)" json:"passwordId"`
}

func (migration *authRefactor) Up(ctx context.Context, db *bun.DB) error {

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback()

	if _, err := tx.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:factor_password"`

			types.Identifiable
			types.TimeAuditable
			Password  string `bun:"password,type:text,notnull" json:"password"`
			Temporary bool   `bun:"temporary,type:boolean,notnull" json:"temporary"`
			UserID    string `bun:"user_id,type:text,notnull,unique,references:user(id)" json:"userId"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// copy passwords from users table to factor_password table
	migration.CopyOldPasswordToNewPassword(ctx, tx)

	// delete profile picture url
	migration.store.Dialect().DropColumn(ctx, tx, "users", "profile_picture_url")
	// delete password
	migration.store.Dialect().DropColumn(ctx, tx, "users", "password")
	// rename name to display name
	migration.store.Dialect().RenameColumn(ctx, tx, "users", "name", "display_name")

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingResetPasswordRequest32), new(FactorResetPasswordRequest32), []string{FactorPasswordReference}, func(ctx context.Context) error {
			existingRequests := make([]*existingResetPasswordRequest32, 0)
			err = tx.
				NewSelect().
				Model(&existingRequests).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingRequests) > 0 {
				// copy users and their passwords to new table
				newRequests, err := migration.
					CopyOldResetPasswordToNewResetPassword(ctx, tx, existingRequests)
				if err != nil {
					return err
				}
				_, err = tx.
					NewInsert().
					Model(&newRequests).
					Exec(ctx)
				if err != nil {
					return err
				}
			}
			return nil
		})
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	// Enable foreign keys
	if err := migration.store.Dialect().ToggleForeignKeyConstraint(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *authRefactor) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *authRefactor) CopyOldPasswordToNewPassword(ctx context.Context, tx bun.IDB) error {

	// get all users from users table
	existingUsers := make([]*existingUser32, 0)
	err := tx.NewSelect().Model(&existingUsers).Scan(ctx)
	if err != nil {
		return err
	}

	newPasswords := make([]*FactorPassword32, 0)
	for _, user := range existingUsers {
		newPasswords = append(newPasswords, &FactorPassword32{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Password:  user.Password,
			Temporary: false,
			UserID:    user.ID,
		})
	}

	// insert
	_, err = tx.NewInsert().Model(&newPasswords).Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (migration *authRefactor) CopyOldResetPasswordToNewResetPassword(ctx context.Context, tx bun.IDB, existingRequests []*existingResetPasswordRequest32) ([]*FactorResetPasswordRequest32, error) {
	newRequests := make([]*FactorResetPasswordRequest32, 0)
	for _, request := range existingRequests {
		// get password id from user id
		var passwordID string
		err := tx.NewSelect().Table("factor_password").Column("id").Where("user_id = ?", request.UserID).Scan(ctx, &passwordID)
		if err != nil {
			return nil, err
		}

		newRequests = append(newRequests, &FactorResetPasswordRequest32{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Token:      request.Token,
			PasswordID: passwordID,
		})
	}
	return newRequests, nil
}

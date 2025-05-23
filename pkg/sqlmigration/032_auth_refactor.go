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

type factorPassword32 struct {
	bun.BaseModel `bun:"table:factor_password"`

	types.Identifiable
	types.TimeAuditable
	Password  string `bun:"password,type:text,notnull" json:"password"`
	Temporary bool   `bun:"temporary,type:boolean,notnull" json:"temporary"`
	UserID    string `bun:"user_id,type:text,notnull" json:"userID"`
}

type existingResetPasswordRequest32 struct {
	bun.BaseModel `bun:"table:reset_password_request"`

	types.Identifiable
	Token  string `bun:"token,type:text,notnull" json:"token"`
	UserID string `bun:"user_id,type:text,notnull,unique" json:"userId"`
}

type newResetPasswordRequest32 struct {
	bun.BaseModel `bun:"table:reset_password_token"`

	types.Identifiable
	Token      string `bun:"token,type:text,notnull" json:"token"`
	PasswordID string `bun:"password_id,type:text,notnull" json:"passwordID"`
}

func (migration *authRefactor) Up(ctx context.Context, db *bun.DB) error {

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.NewCreateTable().
		Model(new(factorPassword32)).
		ForeignKey(`("user_id") REFERENCES "users" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// copy passwords from users table to factor_password table
	err = migration.CopyOldPasswordToNewPassword(ctx, tx)
	if err != nil {
		return err
	}

	// delete profile picture url
	err = migration.store.Dialect().DropColumn(ctx, tx, "users", "profile_picture_url")
	if err != nil {
		return err
	}
	// delete password
	err = migration.store.Dialect().DropColumn(ctx, tx, "users", "password")
	if err != nil {
		return err
	}

	// rename name to display name
	_, err = migration.store.Dialect().RenameColumn(ctx, tx, "users", "name", "display_name")
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingResetPasswordRequest32), new(newResetPasswordRequest32), []string{FactorPasswordReference}, func(ctx context.Context) error {
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
	return nil
}

func (migration *authRefactor) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *authRefactor) CopyOldPasswordToNewPassword(ctx context.Context, tx bun.IDB) error {
	// check if data already in factor_password table
	var count int64
	err := tx.NewSelect().Model(new(factorPassword32)).ColumnExpr("COUNT(*)").Scan(ctx, &count)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	// check if password column exist in the users table.
	exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "users", "password")
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}

	// get all users from users table
	existingUsers := make([]*existingUser32, 0)
	err = tx.NewSelect().Model(&existingUsers).Scan(ctx)
	if err != nil {
		return err
	}

	newPasswords := make([]*factorPassword32, 0)
	for _, user := range existingUsers {
		newPasswords = append(newPasswords, &factorPassword32{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Password:  user.Password,
			Temporary: false,
			UserID:    user.ID,
		})
	}

	// insert
	if len(newPasswords) > 0 {
		_, err = tx.NewInsert().Model(&newPasswords).Exec(ctx)
		if err != nil {
			return err
		}
	}

	return nil
}

func (migration *authRefactor) CopyOldResetPasswordToNewResetPassword(ctx context.Context, tx bun.IDB, existingRequests []*existingResetPasswordRequest32) ([]*newResetPasswordRequest32, error) {
	newRequests := make([]*newResetPasswordRequest32, 0)
	for _, request := range existingRequests {
		// get password id from user id
		var passwordID string
		err := tx.NewSelect().Table("factor_password").Column("id").Where("user_id = ?", request.UserID).Scan(ctx, &passwordID)
		if err != nil {
			return nil, err
		}

		newRequests = append(newRequests, &newResetPasswordRequest32{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Token:      request.Token,
			PasswordID: passwordID,
		})
	}
	return newRequests, nil
}

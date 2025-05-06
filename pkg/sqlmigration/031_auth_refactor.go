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

type existingUser31 struct {
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

type newUser31 struct {
	bun.BaseModel `bun:"table:user"`

	types.Identifiable
	types.TimeAuditable
	DisplayName       string `bun:"display_name,type:text,notnull" json:"displayName"`
	Email             string `bun:"email,type:text,notnull,unique:org_email" json:"email"`
	ProfilePictureURL string `bun:"profile_picture_url,type:text" json:"profilePictureURL"`
	Role              string `bun:"role,type:text,notnull" json:"role"`
	OrgID             string `bun:"org_id,type:text,notnull,unique:org_email,references:org(id),on_delete:CASCADE" json:"orgId"`
}

type FactorPassword31 struct {
	bun.BaseModel `bun:"table:factor_password"`

	types.Identifiable
	types.TimeAuditable
	Password  string `bun:"password,type:text,notnull" json:"password"`
	Temporary bool   `bun:"temporary,type:boolean,notnull" json:"temporary"`
	UserID    string `bun:"user_id,type:text,notnull,unique,references:user(id),on_delete:CASCADE" json:"userId"`
}

type existingResetPasswordRequest31 struct {
	bun.BaseModel `bun:"table:reset_password_request"`

	types.Identifiable
	Token  string `bun:"token,type:text,notnull" json:"token"`
	UserID string `bun:"user_id,type:text,notnull,unique" json:"userId"`
}

type FactorResetPasswordRequest31 struct {
	bun.BaseModel `bun:"table:reset_password_request"`

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

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:factor_password"`

			types.Identifiable
			types.TimeAuditable
			Password  string `bun:"password,type:text,notnull" json:"password"`
			Temporary bool   `bun:"temporary,type:boolean,notnull" json:"temporary"`
			UserID    string `bun:"user_id,type:text,notnull,unique,references:users(id)" json:"userId"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	//  user start
	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingUser31), new(newUser31), []string{OrgReference}, func(ctx context.Context) error {
			existingUsers := make([]*existingUser31, 0)
			err = tx.
				NewSelect().
				Model(&existingUsers).
				Scan(ctx)
			if err != nil {
				if err != sql.ErrNoRows {
					return err
				}
			}

			if err == nil && len(existingUsers) > 0 {
				// copy users and their passwords to new table
				newUsers, newPasswords := migration.
					CopyOldUsersToNewUsers31(tx, existingUsers)
				_, err = tx.
					NewInsert().
					Model(&newUsers).
					Exec(ctx)
				if err != nil {
					return err
				}

				_, err = tx.
					NewInsert().
					Model(&newPasswords).
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

	err = migration.
		store.
		Dialect().
		RenameTableAndModifyModel(ctx, tx, new(existingResetPasswordRequest31), new(FactorResetPasswordRequest31), []string{OrgReference}, func(ctx context.Context) error {
			existingRequests := make([]*existingResetPasswordRequest31, 0)
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

	// reset password requests

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *authRefactor) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *authRefactor) CopyOldUsersToNewUsers31(tx bun.IDB, existingUsers []*existingUser31) ([]*newUser31, []*FactorPassword31) {
	newUsers := make([]*newUser31, 0)
	newPasswords := make([]*FactorPassword31, 0)
	for _, user := range existingUsers {
		newUsers = append(newUsers, &newUser31{
			Identifiable: types.Identifiable{
				ID: valuer.MustNewUUID(user.ID),
			},
			DisplayName:       user.Name,
			Email:             user.Email,
			ProfilePictureURL: user.ProfilePictureURL,
			Role:              user.Role,
			OrgID:             user.OrgID,
		})
		newPasswords = append(newPasswords, &FactorPassword31{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Password:  user.Password,
			Temporary: false,
			UserID:    user.ID,
		})
	}
	return newUsers, newPasswords
}

func (migration *authRefactor) CopyOldResetPasswordToNewResetPassword(ctx context.Context, tx bun.IDB, existingRequests []*existingResetPasswordRequest31) ([]*FactorResetPasswordRequest31, error) {
	newRequests := make([]*FactorResetPasswordRequest31, 0)
	for _, request := range existingRequests {
		// get password id from user id
		var passwordID string
		err := tx.NewSelect().Table("factor_password").Where("user_id = ?", request.UserID).Scan(ctx, &passwordID)
		if err != nil {
			return nil, err
		}

		newRequests = append(newRequests, &FactorResetPasswordRequest31{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Token:      request.Token,
			PasswordID: passwordID,
		})
	}
	return newRequests, nil
}

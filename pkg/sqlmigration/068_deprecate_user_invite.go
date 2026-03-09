package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type deprecateUserInvite struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

type userInviteRow struct {
	bun.BaseModel `bun:"table:user_invite"`

	ID        string    `bun:"id"`
	Name      string    `bun:"name"`
	Email     string    `bun:"email"`
	Role      string    `bun:"role"`
	OrgID     string    `bun:"org_id"`
	Token     string    `bun:"token"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
}

type pendingInviteUser struct {
	bun.BaseModel `bun:"table:users"`

	ID          string    `bun:"id"`
	DisplayName string    `bun:"display_name"`
	Email       string    `bun:"email"`
	Role        string    `bun:"role"`
	OrgID       string    `bun:"org_id"`
	IsRoot      bool      `bun:"is_root"`
	Status      string    `bun:"status"`
	CreatedAt   time.Time `bun:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at"`
	DeletedAt   time.Time `bun:"deleted_at"`
}

func NewDeprecateUserInviteFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("deprecate_user_invite"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &deprecateUserInvite{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *deprecateUserInvite) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *deprecateUserInvite) Up(ctx context.Context, db *bun.DB) error {
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("user_invite"))
	if err != nil {
		if err == sql.ErrNoRows || errors.Ast(err, errors.TypeNotFound) {
			return nil
		}
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// existing invites
	var invites []*userInviteRow
	err = tx.NewSelect().Model(&invites).Scan(ctx)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	// move all invitations to the users table as a pending_invite user
	// skipping any invite whose email+org already has a user entry with non-deleted status
	users := make([]*pendingInviteUser, 0, len(invites))

	for _, invite := range invites {
		existingCount, err := tx.NewSelect().
			TableExpr("users").
			Where("email = ?", invite.Email).
			Where("org_id = ?", invite.OrgID).
			Where("status != ?", "deleted").
			Count(ctx)
		if err != nil {
			return err
		}

		if existingCount > 0 {
			continue
		}

		user := &pendingInviteUser{
			ID:          invite.ID,
			DisplayName: invite.Name,
			Email:       invite.Email,
			Role:        invite.Role,
			OrgID:       invite.OrgID,
			IsRoot:      false,
			Status:      "pending_invite",
			CreatedAt:   invite.CreatedAt,
			UpdatedAt:   time.Now(),
			DeletedAt:   time.Time{},
		}

		users = append(users, user)
	}

	if len(users) > 0 {
		_, err = tx.NewInsert().Model(&users).Exec(ctx)
		if err != nil {
			return err
		}
	}

	// finally drop the user_invite table
	dropTableSqls := migration.sqlschema.Operator().DropTable(table)

	for _, sql := range dropTableSqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *deprecateUserInvite) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

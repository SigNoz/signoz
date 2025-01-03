package cloudintegrations

import "github.com/jmoiron/sqlx"

type Controller struct {
	db *sqlx.DB
}

func NewController(db *sqlx.DB) (
	*Controller, error,
) {
	return &Controller{
		db: db,
	}, nil
}

type AccountsListResponse struct {
	Accounts []Account `json:"accounts"`
}

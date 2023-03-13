package model

import (
	"time"
)

type Creator struct {
	CreatedBy string    `json:"created_by" db:"created_by"`
	Created   time.Time `json:"created_at"  db:"created_at"`
}

type Updater struct {
	UpdatedBy string
	Updated   time.Time
}

type AuditRecord struct {
	Creator
	Updater
}

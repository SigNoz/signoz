package model

import (
	"time"
)

type Creator struct {
	CreatedBy string
	Created   time.Time
}

type Updater struct {
	UpdatedBy string
	Updated   time.Time
}

type AuditRecord struct {
	Creator
	Updater
}

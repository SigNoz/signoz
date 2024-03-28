package model

import "time"

type Key struct {
	Id            string `json:"id" db:"id"`
	Name          string `json:"name" db:"name"`
	Value         string `json:"value" db:"value"`
	CreatedBy     string `json:"created_by" db:"created_by"`
	CreatedAt     int64  `json:"created_at" db:"created_at"`
	ExpiresAt     int64  `json:"expires_at" db:"expires_at"`
	CreatedByUser User   `json:"createdByUser"`
}

type CreateKeyReqModel struct {
	Name      string    `json:"name"`
	ExpiresAt time.Time `json:"expires_at"`
}

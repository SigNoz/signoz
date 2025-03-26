package model

import "github.com/SigNoz/signoz/pkg/types"

type User struct {
	Id                string `json:"id" db:"id"`
	Name              string `json:"name" db:"name"`
	Email             string `json:"email" db:"email"`
	CreatedAt         int64  `json:"createdAt" db:"created_at"`
	ProfilePictureURL string `json:"profilePictureURL" db:"profile_picture_url"`
	NotFound          bool   `json:"notFound"`
}

type CreatePATRequestBody struct {
	Name          string `json:"name"`
	Role          string `json:"role"`
	ExpiresInDays int64  `json:"expiresInDays"`
}

type PAT struct {
	CreatedByUser User `json:"createdByUser"`
	UpdatedByUser User `json:"updatedByUser"`

	types.StorablePersonalAccessToken
}

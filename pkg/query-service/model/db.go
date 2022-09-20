package model

type Organization struct {
	Id              string `json:"id" db:"id"`
	Name            string `json:"name" db:"name"`
	CreatedAt       int64  `json:"createdAt" db:"created_at"`
	IsAnonymous     bool   `json:"isAnonymous" db:"is_anonymous"`
	HasOptedUpdates bool   `json:"hasOptedUpdates" db:"has_opted_updates"`
}

// InvitationObject represents the token object stored in the db
type InvitationObject struct {
	Id        string `json:"id" db:"id"`
	Email     string `json:"email" db:"email"`
	Name      string `json:"name" db:"name"`
	Token     string `json:"token" db:"token"`
	CreatedAt int64  `json:"createdAt" db:"created_at"`
	Role      string `json:"role" db:"role"`
	OrgId     string `json:"orgId" db:"org_id"`
}

type User struct {
	Id                 string `json:"id" db:"id"`
	Name               string `json:"name" db:"name"`
	Email              string `json:"email" db:"email"`
	Password           string `json:"password,omitempty" db:"password"`
	CreatedAt          int64  `json:"createdAt" db:"created_at"`
	ProfilePirctureURL string `json:"profilePictureURL" db:"profile_picture_url"`
	OrgId              string `json:"orgId,omitempty" db:"org_id"`
	GroupId            string `json:"groupId,omitempty" db:"group_id"`
}

type UserPayload struct {
	User
	Role         string `json:"role"`
	Organization string `json:"organization"`
}

type Group struct {
	Id   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}

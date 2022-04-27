package model

type UserPreferences struct {
	Id              int    `json:"id" db:"id"`
	Uuid            string `json:"uuid" db:"uuid"`
	IsAnonymous     bool   `json:"isAnonymous" db:"isAnonymous"`
	HasOptedUpdates bool   `json:"hasOptedUpdates" db:"hasOptedUpdates"`
}

type Organization struct {
	Id              string `json:"id" db:"id"`
	Name            string `json:"name" db:"name"`
	CreatedAt       int64  `json:"createdAt" db:"created_at"`
	IsAnonymous     bool   `json:"isAnonymous" db:"is_anonymous"`
	HasOptedUpdates bool   `json:"hasOptedUpdates" db:"has_opted_updates"`
}

type InvitationObject struct {
	Email     string `json:"email" db:"email"`
	Name      string `json:"name" db:"name"`
	Token     string `json:"token" db:"token"`
	CreatedAt int64  `json:"createdAt" db:"created_at"`
	Role      string `json:"role" db:"role"`
	OrgId     string `json:"orgId" db:"org_id"`
}

type User struct {
	Id        string `json:"id" db:"id"`
	Name      string `json:"name" db:"name"`
	OrgId     string `json:"orgId,omitempty" db:"org_id"`
	Email     string `json:"email" db:"email"`
	Password  string `json:"password,omitempty" db:"password"`
	CreatedAt int64  `json:"createdAt" db:"created_at"`

	// Methods to operate on ProfilePictureURL are not written. It is added in the table
	// fof it's introduction in future.
	ProfilePirctureURL string `json:"profilePictureURL" db:"profile_picture_url"`
}

type Group struct {
	Id   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type GroupUser struct {
	GroupId string `json:"group_id,omitempty" db:"group_id"`
	UserId  string `json:"user_id" db:"user_id"`
}

type GroupRule struct {
	GroupId string `json:"group_id,omitempty" db:"group_id"`
	RuleId  string `json:"rule_id" db:"rule_id"`
}

type RBACRule struct {
	Id         string `json:"id" db:"id"`
	ApiClass   string `json:"api_class" db:"api_class"`
	Permission int    `json:"permission" db:"permission"`
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}

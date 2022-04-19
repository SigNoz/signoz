package model

type InviteRequest struct {
	Email string `json:"email"`
	Role  string `json:role"`
}

type InviteResponse struct {
	Email       string `json:"email"`
	InviteToken string `json:"inviteToken"`
}

type Invitation struct {
	Email     string `json:"email" db:"email"`
	Token     string `json:"token" db:"token"`
	CreatedAt int64  `json:"createdAt" db:"created_at"`
	Role      string `json:"role" db:"role"`
}

type User struct {
	Id               string `json:"id" db:"id"`
	Name             string `json:"name" db:"name"`
	OrganizationName string `json:"orgName,omitempty" db:"org_name"`
	Email            string `json:"email" db:"email"`
	Password         string `json:"password,omitempty" db:"password"`
	CreatedAt        int64  `json:"createdAt" db:"created_at"`

	// Methods to operate on ProfilePictureURL are not written. It is added in the table
	// fof it's introduction in future.
	ProfilePirctureURL string `json:"profilePictureURL" db:"profile_picture_url"`
}

type Group struct {
	Id   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type RBACRule struct {
	Id         string `json:"id" db:"id"`
	ApiClass   string `json:"api_class" db:"api_class"`
	Permission int    `json:"permission" db:"permission"`
}

type GroupUser struct {
	GroupId string `json:"group_id,omitempty" db:"group_id"`
	UserId  string `json:"user_id" db:"user_id"`
}

type GroupRule struct {
	GroupId string `json:"group_id,omitempty" db:"group_id"`
	RuleId  string `json:"rule_id" db:"rule_id"`
}

type UserRole struct {
	UserId    string `json:"user_id"`
	GroupName string `json:"group_name"`
}

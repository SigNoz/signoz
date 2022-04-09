package model

type User struct {
	Id               string `json:"id" db:"id"`
	Name             string `json:"name" db:"name"`
	OrganizationName string `json:"org_name,omitempty" db:"org_name"`
	Email            string `json:"email" db:"email"`
	Password         string `json:"password,omitempty" db:"password"`
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

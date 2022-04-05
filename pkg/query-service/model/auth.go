package model

type UserParams struct {
	Email    string `json:"email" db:"email"`
	Password string `json:"password" db:"password"`
}

type Group struct {
	Id   int    `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type GroupUser struct {
	GroupId   int    `json:"groupId,omitempty" db:"groupId"`
	GroupName string `json:"groupName" db:"groupName"`
	UserId    int    `json:"userId" db:"userId"`
}

type GroupRule struct {
	GroupId   int    `json:"groupId,omitempty" db:"groupId"`
	GroupName string `json:"groupName" db:"groupName"`
	RuleId    int    `json:"ruleId" db:"ruleId"`
}

type RBACRule struct {
	Id         int64  `json:"id" db:"id"`
	Api        string `json:"api" db:"api"`
	Permission int    `json:"permission" db:"permission"`
}

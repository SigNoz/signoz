package auth

type Permission int32

const (
	ReadPermission = iota
	WritePermission
)

type Rule struct {
	RuleId string
	Api    string
	Perm   Permission
}

type Group struct {
	GroupID   string
	GroupName string
	Users     []User
	Rules     []Rule
}

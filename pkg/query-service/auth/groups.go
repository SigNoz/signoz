package auth

type Rule struct {
	Service string
	Perm    uint32
}

type Group struct {
	GroupID string
	Users   []User
	Rules   []Rule
}

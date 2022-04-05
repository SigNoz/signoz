package model

type UserPreferences struct {
	Id              int    `json:"id" db:"id"`
	Uuid            string `json:"uuid" db:"uuid"`
	IsAnonymous     bool   `json:"isAnonymous" db:"isAnonymous"`
	HasOptedUpdates bool   `json:"hasOptedUpdates" db:"hasOptedUpdates"`
}

func (up *UserPreferences) SetIsAnonymous(isAnonymous bool) {
	up.IsAnonymous = isAnonymous
}
func (up *UserPreferences) SetHasOptedUpdate(hasOptedUpdates bool) {
	up.HasOptedUpdates = hasOptedUpdates
}
func (up *UserPreferences) GetIsAnonymous() bool {
	return up.IsAnonymous
}
func (up *UserPreferences) GetHasOptedUpdate() bool {
	return up.HasOptedUpdates
}
func (up *UserPreferences) GetId() int {
	return up.Id
}
func (up *UserPreferences) GetUUID() string {
	return up.Uuid
}

type UserParams struct {
	Email    string `json:"email" db:"email"`
	Password string `json:"password" db:"password"`
}

type Group struct {
	Id   int32  `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

type GroupUser struct {
	Id     int32  `json:"id" db:"id"`
	UserId string `json:"userId" db:"userId"`
}

type GroupRule struct {
	Id     int32  `json:"id" db:"id"`
	RuleId string `json:"ruleId" db:"ruleId"`
}

type RBACRule struct {
	Id         int32  `json:"id" db:"id"`
	Api        string `json:"api" db:"api"`
	Permission int32  `json:"permission" db:"permission"`
}

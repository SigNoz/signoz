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

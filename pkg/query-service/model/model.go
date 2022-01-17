package model

type UserPreferences struct {
	id              int  `json:"id" db:"id"`
	isAnonymous     bool `json:"isAnonymous" db:"isAnonymous"`
	hasOptedUpdates bool `json:"hasOptedUpdates" db:"hasOptedUpdates"`
}

func (up *UserPreferences) SetIsAnonymous(isAnonymous bool) {
	up.isAnonymous = isAnonymous
}
func (up *UserPreferences) SetHasOptedUpdate(hasOptedUpdates bool) {
	up.hasOptedUpdates = hasOptedUpdates
}
func (up *UserPreferences) GetIsAnonymous() bool {
	return up.isAnonymous
}
func (up *UserPreferences) GetHasOptedUpdate() bool {
	return up.hasOptedUpdates
}
func (up *UserPreferences) GetId() int {
	return up.id
}

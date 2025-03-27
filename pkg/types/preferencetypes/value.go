package preferencetypes

const (
	PreferenceValueTypeInteger string = "integer"
	PreferenceValueTypeFloat   string = "float"
	PreferenceValueTypeString  string = "string"
	PreferenceValueTypeBoolean string = "boolean"
)

const (
	OrgAllowedScope  string = "org"
	UserAllowedScope string = "user"
)

type Range struct {
	Min int64 `json:"min"`
	Max int64 `json:"max"`
}

type PreferenceWithValue struct {
	Preference
	Value interface{} `json:"value"`
}

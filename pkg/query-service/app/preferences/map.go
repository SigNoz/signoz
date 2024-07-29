package preferences

var preferenceMap = map[string]Preference{
	"DASHBOARDS_LIST_VIEW": {
		Key:              "DASHBOARDS_LIST_VIEW",
		Name:             "Dashboards List View",
		Description:      "",
		ValueType:        "string",
		DefaultValue:     "grid",
		AllowedValues:    []interface{}{"grid", "list"},
		IsDiscreteValues: true,
		AllowedScopes:    []string{"user", "org"},
	},
	"LOGS_TOOLBAR_COLLAPSED": {
		Key:              "LOGS_TOOLBAR_COLLAPSED",
		Name:             "Logs toolbar",
		Description:      "",
		ValueType:        "boolean",
		DefaultValue:     false,
		AllowedValues:    []interface{}{true, false},
		IsDiscreteValues: true,
		AllowedScopes:    []string{"user", "org"},
	},
	"MAX_DEPTH_ALLOWED": {
		Key:              "MAX_DEPTH_ALLOWED",
		Name:             "Max Depth Allowed",
		Description:      "",
		ValueType:        "integer",
		DefaultValue:     10,
		IsDiscreteValues: false,
		Range: Range{
			Min: 0,
			Max: 100,
		},
		AllowedScopes: []string{"user", "org"},
	},
}

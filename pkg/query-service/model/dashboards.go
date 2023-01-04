package model

type Datasource struct {
	Type string `json:"type"`
	UID  string `json:"uid"`
}

type Panels struct {
	Datasource  interface{} `json:"datasource"`
	Description string      `json:"description,omitempty"`
	FieldConfig struct {
		Defaults struct {
			Color struct {
				Mode string `json:"mode"`
			} `json:"color"`
			Max        float64 `json:"max"`
			Min        float64 `json:"min"`
			Thresholds struct {
				Mode  string `json:"mode"`
				Steps []struct {
					Color string      `json:"color"`
					Value interface{} `json:"value"`
				} `json:"steps"`
			} `json:"thresholds"`
			Unit string `json:"unit"`
		} `json:"defaults"`
		Overrides []interface{} `json:"overrides"`
	} `json:"fieldConfig,omitempty"`
	GridPos struct {
		H int `json:"h"`
		W int `json:"w"`
		X int `json:"x"`
		Y int `json:"y"`
	} `json:"gridPos"`
	ID      int           `json:"id"`
	Links   []interface{} `json:"links,omitempty"`
	Options struct {
		Orientation   string `json:"orientation"`
		ReduceOptions struct {
			Calcs  []string `json:"calcs"`
			Fields string   `json:"fields"`
			Values bool     `json:"values"`
		} `json:"reduceOptions"`
		ShowThresholdLabels  bool `json:"showThresholdLabels"`
		ShowThresholdMarkers bool `json:"showThresholdMarkers"`
	} `json:"options,omitempty"`
	PluginVersion string `json:"pluginVersion,omitempty"`
	Targets       []struct {
		Datasource     interface{} `json:"datasource"`
		EditorMode     string      `json:"editorMode"`
		Expr           string      `json:"expr"`
		Hide           bool        `json:"hide"`
		IntervalFactor int         `json:"intervalFactor"`
		LegendFormat   string      `json:"legendFormat"`
		Range          bool        `json:"range"`
		RefID          string      `json:"refId"`
		Step           int         `json:"step"`
	} `json:"targets"`
	Title            string   `json:"title"`
	Type             string   `json:"type"`
	HideTimeOverride bool     `json:"hideTimeOverride,omitempty"`
	MaxDataPoints    int      `json:"maxDataPoints,omitempty"`
	Collapsed        bool     `json:"collapsed,omitempty"`
	Panels           []Panels `json:"panels,omitempty"`
}

type GrafanaJSON struct {
	Inputs []struct {
		Name        string `json:"name"`
		Label       string `json:"label"`
		Description string `json:"description"`
		Type        string `json:"type"`
		PluginID    string `json:"pluginId"`
		PluginName  string `json:"pluginName"`
	} `json:"__inputs"`
	Requires []struct {
		Type    string `json:"type"`
		ID      string `json:"id"`
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"__requires"`
	Annotations struct {
		List []struct {
			HashKey    string      `json:"$$hashKey"`
			BuiltIn    int         `json:"builtIn"`
			Datasource interface{} `json:"datasource"`
			Enable     bool        `json:"enable"`
			Hide       bool        `json:"hide"`
			IconColor  string      `json:"iconColor"`
			Name       string      `json:"name"`
			Target     struct {
				Limit    int           `json:"limit"`
				MatchAny bool          `json:"matchAny"`
				Tags     []interface{} `json:"tags"`
				Type     string        `json:"type"`
			} `json:"target"`
			Type string `json:"type"`
		} `json:"list"`
	} `json:"annotations"`
	Editable             bool        `json:"editable"`
	FiscalYearStartMonth int         `json:"fiscalYearStartMonth"`
	GnetID               int         `json:"gnetId"`
	GraphTooltip         int         `json:"graphTooltip"`
	ID                   interface{} `json:"id"`
	Links                []struct {
		Icon        string        `json:"icon"`
		Tags        []interface{} `json:"tags"`
		TargetBlank bool          `json:"targetBlank"`
		Title       string        `json:"title"`
		Type        string        `json:"type"`
		URL         string        `json:"url"`
	} `json:"links"`
	LiveNow       bool     `json:"liveNow"`
	Panels        []Panels `json:"panels"`
	SchemaVersion int      `json:"schemaVersion"`
	Style         string   `json:"style"`
	Tags          []string `json:"tags"`
	Templating    struct {
		List []struct {
			Current struct {
				Selected bool        `json:"selected"`
				Text     interface{} `json:"text"`
				Value    interface{} `json:"value"`
			} `json:"current"`
			Hide           int           `json:"hide"`
			IncludeAll     bool          `json:"includeAll"`
			Label          string        `json:"label,omitempty"`
			Multi          bool          `json:"multi"`
			Name           string        `json:"name"`
			Options        []interface{} `json:"options"`
			Query          interface{}   `json:"query"`
			Refresh        int           `json:"refresh,omitempty"`
			Regex          string        `json:"regex,omitempty"`
			SkipURLSync    bool          `json:"skipUrlSync"`
			Type           string        `json:"type"`
			Datasource     interface{}   `json:"datasource,omitempty"`
			Definition     string        `json:"definition,omitempty"`
			Sort           int           `json:"sort,omitempty"`
			TagValuesQuery string        `json:"tagValuesQuery,omitempty"`
			TagsQuery      string        `json:"tagsQuery,omitempty"`
			UseTags        bool          `json:"useTags,omitempty"`
		} `json:"list"`
	} `json:"templating"`
	Time struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"time"`
	Timepicker struct {
		RefreshIntervals []string `json:"refresh_intervals"`
		TimeOptions      []string `json:"time_options"`
	} `json:"timepicker"`
	Timezone  string `json:"timezone"`
	Title     string `json:"title"`
	UID       string `json:"uid"`
	Version   int    `json:"version"`
	WeekStart string `json:"weekStart"`
}
type Layout struct {
	H      int    `json:"h"`
	I      string `json:"i"`
	Moved  bool   `json:"moved"`
	Static bool   `json:"static"`
	W      int    `json:"w"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

type Variable struct {
	AllSelected      bool   `json:"allSelected"`
	CustomValue      string `json:"customValue"`
	Description      string `json:"description"`
	ModificationUUID string `json:"modificationUUID"`
	MultiSelect      bool   `json:"multiSelect"`
	QueryValue       string `json:"queryValue"`
	SelectedValue    string `json:"selectedValue"`
	ShowALLOption    bool   `json:"showALLOption"`
	Sort             string `json:"sort"`
	TextboxValue     string `json:"textboxValue"`
	Type             string `json:"type"`
}

type Data struct {
	Legend    string        `json:"legend"`
	Query     string        `json:"query"`
	QueryData []interface{} `json:"queryData"`
}

type QueryDataDashboard struct {
	Data         Data   `json:"data"`
	Error        bool   `json:"error"`
	ErrorMessage string `json:"errorMessage"`
	Loading      bool   `json:"loading"`
}

type ClickHouseQueryDashboard struct {
	Legend   string `json:"legend"`
	Name     string `json:"name"`
	Query    string `json:"rawQuery"`
	Disabled bool   `json:"disabled"`
}

type QueryBuilder struct {
	AggregateOperator interface{} `json:"aggregateOperator"`
	Disabled          bool        `json:"disabled"`
	GroupBy           []string    `json:"groupBy"`
	Legend            string      `json:"legend"`
	MetricName        string      `json:"metricName"`
	Name              string      `json:"name"`
	TagFilters        TagFilters  `json:"tagFilters"`
	ReduceTo          interface{} `json:"reduceTo"`
}

type MetricsBuilder struct {
	Formulas     []string       `json:"formulas"`
	QueryBuilder []QueryBuilder `json:"queryBuilder"`
}

type PromQueryDashboard struct {
	Query    string `json:"query"`
	Disabled bool   `json:"disabled"`
	Name     string `json:"name"`
	Legend   string `json:"legend"`
}

type Query struct {
	ClickHouse     []ClickHouseQueryDashboard `json:"clickHouse"`
	PromQL         []PromQueryDashboard       `json:"promQL"`
	MetricsBuilder MetricsBuilder             `json:"metricsBuilder"`
	QueryType      int                        `json:"queryType"`
}

type Widget struct {
	Description    string             `json:"description"`
	ID             string             `json:"id"`
	IsStacked      bool               `json:"isStacked"`
	NullZeroValues string             `json:"nullZeroValues"`
	Opacity        string             `json:"opacity"`
	PanelTypes     string             `json:"panelTypes"`
	Query          Query              `json:"query"`
	QueryData      QueryDataDashboard `json:"queryData"`
	TimePreferance string             `json:"timePreferance"`
	Title          string             `json:"title"`
	YAxisUnit      string             `json:"yAxisUnit"`
	QueryType      int                `json:"queryType"`
}

type DashboardData struct {
	Description string              `json:"description"`
	Tags        []string            `json:"tags"`
	Layout      []Layout            `json:"layout"`
	Title       string              `json:"title"`
	Widgets     []Widget            `json:"widgets"`
	Variables   map[string]Variable `json:"variables"`
}

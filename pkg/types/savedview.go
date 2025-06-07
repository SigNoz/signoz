package types

import (
	"strings"

	"github.com/uptrace/bun"
)

type SavedView struct {
	bun.BaseModel `bun:"table:saved_views"`

	Identifiable
	TimeAuditable
	UserAuditable
	OrgID      string `json:"orgId" bun:"org_id,notnull"`
	Name       string `json:"name" bun:"name,type:text,notnull"`
	Category   string `json:"category" bun:"category,type:text,notnull"`
	SourcePage string `json:"sourcePage" bun:"source_page,type:text,notnull"`
	Tags       string `json:"tags" bun:"tags,type:text"`
	Data       string `json:"data" bun:"data,type:text,notnull"`
	ExtraData  string `json:"extraData" bun:"extra_data,type:text"`
}

func NewStatsFromSavedViews(savedViews []*SavedView) map[string]any {
	stats := make(map[string]any)
	for _, savedView := range savedViews {
		key := "savedview.source." + strings.ToLower(string(savedView.SourcePage)) + ".count"
		if _, ok := stats[key]; !ok {
			stats[key] = int64(1)
		} else {
			stats[key] = stats[key].(int64) + 1
		}
	}

	stats["savedview.count"] = int64(len(savedViews))
	return stats
}

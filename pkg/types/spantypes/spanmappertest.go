package spantypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type SpanMapperTestSpan struct {
	Attributes map[string]any `json:"attributes"`
	Resource   map[string]any `json:"resource"`
}

// Mappers is optional because the module can backfill from the store by Group.Name.
type PostableSpanMapperTestGroup struct {
	PostableSpanMapperGroup
	Mappers []PostableSpanMapper `json:"mappers"`
}

type PostableSpanMapperTest struct {
	Spans  []SpanMapperTestSpan          `json:"spans"  required:"true"`
	Groups []PostableSpanMapperTestGroup `json:"groups" required:"true"`
}

type GettableSpanMapperTest struct {
	Spans         []SpanMapperTestSpan `json:"spans"`
	CollectorLogs []string             `json:"collectorLogs"`
}

func NewSpanMapperGroupsWithMappersFromPostable(orgID valuer.UUID, in []PostableSpanMapperTestGroup) []*SpanMapperGroupWithMappers {
	out := make([]*SpanMapperGroupWithMappers, 0, len(in))
	for _, pg := range in {
		var mappers []*SpanMapper
		if pg.Mappers != nil {
			mappers = make([]*SpanMapper, 0, len(pg.Mappers))
			for _, pm := range pg.Mappers {
				mappers = append(mappers, &SpanMapper{
					Name:         pm.Name,
					FieldContext: pm.FieldContext,
					Config:       pm.Config,
					Enabled:      pm.Enabled,
				})
			}
		}
		out = append(out, &SpanMapperGroupWithMappers{
			Group: &SpanMapperGroup{
				OrgID:     orgID,
				Name:      pg.Name,
				Condition: pg.Condition,
				Enabled:   pg.Enabled,
			},
			Mappers: mappers,
		})
	}
	return out
}

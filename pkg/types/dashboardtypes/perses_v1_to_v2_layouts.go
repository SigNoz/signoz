package dashboardtypes

import (
	"fmt"
	"sort"

	"github.com/perses/spec/go/common"
	"github.com/perses/spec/go/dashboard"
)

// ══════════════════════════════════════════════
// Layouts (data.layout + data.panelMap)
// ══════════════════════════════════════════════

// convertV1Layouts groups v1 react-grid-layout entries by section. Each row
// widget (panelTypes == "row") in `widgets` plus its `panelMap` entry becomes
// a separate v2 grid layout with a collapsible display. Widgets that are not
// part of any section land in a default unnamed grid (added only if any such
// widgets exist).
func convertV1Layouts(data StorableDashboardData) []Layout {
	layoutsRaw := readSliceOfMaps(data["layout"])
	if len(layoutsRaw) == 0 {
		return nil
	}
	panelMap, _ := data["panelMap"].(map[string]any)

	rows, widgetIDToRow := indexRows(data["widgets"], panelMap)

	type bucket struct {
		title    string
		open     bool
		isRow    bool
		layouts  []map[string]any
		ordering int
	}
	rootBucket := &bucket{}
	rowBuckets := make(map[string]*bucket, len(rows))
	for _, row := range rows {
		rowBuckets[row.id] = &bucket{
			title:    row.title,
			open:     !row.collapsed,
			isRow:    true,
			ordering: row.ordering,
		}
	}

	for _, item := range layoutsRaw {
		widgetID, _ := item["i"].(string)
		if widgetID == "" {
			continue
		}
		if rowID, ok := widgetIDToRow[widgetID]; ok {
			if b, ok := rowBuckets[rowID]; ok {
				b.layouts = append(b.layouts, item)
				continue
			}
		}
		// row widgets themselves shouldn't end up as items in the root grid;
		// they exist only to anchor their section.
		if _, isRow := rowBuckets[widgetID]; isRow {
			continue
		}
		rootBucket.layouts = append(rootBucket.layouts, item)
	}

	out := make([]Layout, 0, len(rows)+1)
	if len(rootBucket.layouts) > 0 {
		out = append(out, gridLayoutFromBucket("", true, false, rootBucket.layouts))
	}

	rowKeys := make([]string, 0, len(rowBuckets))
	for id := range rowBuckets {
		rowKeys = append(rowKeys, id)
	}
	sort.SliceStable(rowKeys, func(i, j int) bool {
		return rowBuckets[rowKeys[i]].ordering < rowBuckets[rowKeys[j]].ordering
	})
	for _, id := range rowKeys {
		b := rowBuckets[id]
		out = append(out, gridLayoutFromBucket(b.title, b.open, true, b.layouts))
	}
	return out
}

type rowInfo struct {
	id        string
	title     string
	collapsed bool
	ordering  int
}

func indexRows(widgetsRaw any, panelMap map[string]any) ([]rowInfo, map[string]string) {
	widgets := readSliceOfMaps(widgetsRaw)
	rows := make([]rowInfo, 0)
	widgetToRow := make(map[string]string)
	for i, w := range widgets {
		if t, _ := w["panelTypes"].(string); t != "row" {
			continue
		}
		id, _ := w["id"].(string)
		if id == "" {
			continue
		}
		title, _ := w["title"].(string)
		row := rowInfo{id: id, title: title, ordering: i}
		if pm, ok := panelMap[id].(map[string]any); ok {
			row.collapsed = valueAt[bool](pm, "collapsed")
			for _, child := range readSliceOfMaps(pm["widgets"]) {
				if childID, _ := child["i"].(string); childID != "" {
					widgetToRow[childID] = id
				}
			}
		}
		rows = append(rows, row)
	}
	return rows, widgetToRow
}

func gridLayoutFromBucket(title string, open, isRow bool, items []map[string]any) Layout {
	spec := dashboard.GridLayoutSpec{Items: make([]dashboard.GridItem, 0, len(items))}
	if title != "" || isRow {
		spec.Display = &dashboard.GridLayoutDisplay{Title: title}
		if isRow {
			spec.Display.Collapse = &dashboard.GridLayoutCollapse{Open: open}
		}
	}
	for _, item := range items {
		widgetID, _ := item["i"].(string)
		spec.Items = append(spec.Items, dashboard.GridItem{
			X:       intAt(item, "x"),
			Y:       intAt(item, "y"),
			Width:   intAt(item, "w"),
			Height:  intAt(item, "h"),
			Content: &common.JSONRef{Ref: fmt.Sprintf("#/spec/panels/%s", widgetID)},
		})
	}
	return Layout{Kind: dashboard.KindGridLayout, Spec: &spec}
}

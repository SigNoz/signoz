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

// convertV1Layouts groups v1 react-grid-layout entries into v2 grid layouts.
// Membership is positional (as the frontend renders): each row widget owns the
// panels below it until the next row; panels above the first row form an unnamed
// grid with no section header. Collapsed rows are the exception — their children
// live in panelMap[rowID].widgets, not `layout`.
func convertV1Layouts(data StorableDashboardData) ([]Layout, error) {
	if raw := data["layout"]; raw != nil {
		if _, ok := raw.([]any); !ok {
			return nil, malformedV1FieldErr("layout", raw)
		}
	}
	if raw := data["panelMap"]; raw != nil {
		if _, ok := raw.(map[string]any); !ok {
			return nil, malformedV1FieldErr("panelMap", raw)
		}
	}

	layout := readSliceOfMaps(data["layout"])
	if len(layout) == 0 {
		return nil, nil
	}

	rows := extractRowsAndCollapsedWidgets(data["widgets"], data["panelMap"])

	// Skip collapsed-row children a malformed dashboard lists in `layout` too.
	isWidgetCollapsed := make(map[string]bool)
	for _, row := range rows {
		for _, child := range row.collapsedWidgets {
			if id, _ := child["i"].(string); id != "" {
				isWidgetCollapsed[id] = true
			}
		}
	}

	// this lets us track the current row under which widgets are to be added.
	sortByPosition(layout)

	type section struct {
		row   *rowInfo // nil for the unnamed grid of ungrouped panels
		items []map[string]any
	}
	topSectionWithoutHeader := &section{}
	sectionsWithHeader := make([]*section, 0, len(rows))
	currentRowHeader := topSectionWithoutHeader
	for _, item := range layout {
		id, _ := item["i"].(string)
		if id == "" || isWidgetCollapsed[id] {
			continue
		}
		if row, ok := rows[id]; ok {
			newRowHeader := &section{row: row, items: row.collapsedWidgets}
			sectionsWithHeader = append(sectionsWithHeader, newRowHeader)
			// A collapsed row owns only its stashed children; later panels → ungrouped.
			if row.collapsed {
				currentRowHeader = topSectionWithoutHeader
			} else {
				currentRowHeader = newRowHeader
			}
			continue
		}
		currentRowHeader.items = append(currentRowHeader.items, item)
	}

	out := make([]Layout, 0, len(sectionsWithHeader)+1)
	if len(topSectionWithoutHeader.items) > 0 {
		out = append(out, buildV2GridLayout(nil, topSectionWithoutHeader.items))
	}
	for _, sec := range sectionsWithHeader {
		out = append(out, buildV2GridLayout(sec.row, sec.items))
	}
	return out, nil
}

type rowInfo struct {
	title            string
	collapsed        bool
	collapsedWidgets []map[string]any
}

// extractRowsAndCollapsedWidgets returns the row widgets keyed by id; collapsed rows also carry their
// children stashed under panelMap[id].widgets.
func extractRowsAndCollapsedWidgets(widgetsRaw, panelMapRaw any) map[string]*rowInfo {
	panelMap, _ := panelMapRaw.(map[string]any)
	rows := make(map[string]*rowInfo)
	for _, w := range readSliceOfMaps(widgetsRaw) {
		id := valueAt[string](w, "id")
		if valueAt[string](w, "panelTypes") != "row" || id == "" {
			continue
		}
		row := &rowInfo{title: valueAt[string](w, "title")}
		if pm, ok := panelMap[id].(map[string]any); ok && valueAt[bool](pm, "collapsed") {
			row.collapsed = true
			row.collapsedWidgets = readSliceOfMaps(pm["widgets"])
		}
		rows[id] = row
	}
	return rows
}

// buildV2GridLayout builds one v2 grid. row is nil for the unnamed grid (no display);
// otherwise the grid takes the row's title and collapse state. Items are sorted
// by (y, x) and their y's normalized so the topmost sits at 0.
func buildV2GridLayout(row *rowInfo, items []map[string]any) Layout {
	sortByPosition(items)

	spec := dashboard.GridLayoutSpec{Items: make([]dashboard.GridItem, 0, len(items))}
	if row != nil {
		spec.Display = &dashboard.GridLayoutDisplay{
			Title:    row.title,
			Collapse: &dashboard.GridLayoutCollapse{Open: !row.collapsed},
		}
	}

	minY := 0
	if len(items) > 0 {
		minY = intAt(items[0], "y") // sorted by y, so the first item is topmost
	}
	for _, item := range items {
		id, _ := item["i"].(string)
		spec.Items = append(spec.Items, dashboard.GridItem{
			X:       intAt(item, "x"),
			Y:       intAt(item, "y") - minY,
			Width:   intAt(item, "w"),
			Height:  intAt(item, "h"),
			Content: &common.JSONRef{Ref: fmt.Sprintf("#/spec/panels/%s", id)},
		})
	}
	return Layout{Kind: dashboard.KindGridLayout, Spec: &spec}
}

func sortByPosition(items []map[string]any) {
	sort.SliceStable(items, func(i, j int) bool {
		if yi, yj := intAt(items[i], "y"), intAt(items[j], "y"); yi != yj {
			return yi < yj
		}
		return intAt(items[i], "x") < intAt(items[j], "x")
	})
}

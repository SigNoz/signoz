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
func (d *v1Decoder) convertV1Layouts(data StorableDashboardData) []Layout {
	layout := d.readObjects(data, "layout")
	if len(layout) == 0 {
		return nil
	}

	rows := d.extractRowsAndCollapsedWidgets(data)

	// `layout` ids must correspond to a real widget. react-grid-layout leaks a
	// "__dropping-elem__" drag placeholder (and stale entries can outlive a
	// deleted widget) into the saved layout; both would otherwise become grid
	// items referencing a non-existent panel.
	widgetIDs := make(map[string]bool)
	for _, w := range d.readObjects(data, "widgets") {
		if id := d.readString(w, "id"); id != "" {
			widgetIDs[id] = true
		}
	}

	// Skip collapsed-row children a malformed dashboard lists in `layout` too.
	isWidgetCollapsed := make(map[string]bool)
	for _, row := range rows {
		for _, child := range row.collapsedWidgets {
			if id := d.readString(child, "i"); id != "" {
				isWidgetCollapsed[id] = true
			}
		}
	}

	d.sortByPosition(layout)

	type section struct {
		row   *rowInfo // nil for the unnamed grid of ungrouped panels
		items []map[string]any
	}
	topSectionWithoutHeader := &section{}
	sectionsWithHeader := make([]*section, 0, len(rows))
	currentRowHeader := topSectionWithoutHeader
	for _, item := range layout {
		id := d.readString(item, "i")
		if id == "" || isWidgetCollapsed[id] || !widgetIDs[id] {
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
		out = append(out, d.buildV2GridLayout(nil, topSectionWithoutHeader.items))
	}
	for _, sec := range sectionsWithHeader {
		out = append(out, d.buildV2GridLayout(sec.row, sec.items))
	}
	return out
}

type rowInfo struct {
	title            string
	collapsed        bool
	collapsedWidgets []map[string]any
}

// extractRowsAndCollapsedWidgets returns the row widgets keyed by id; collapsed
// rows also carry their children stashed under panelMap[id].widgets.
func (d *v1Decoder) extractRowsAndCollapsedWidgets(data StorableDashboardData) map[string]*rowInfo {
	panelMap := d.readObject(data, "panelMap")
	rows := make(map[string]*rowInfo)
	for _, w := range d.readObjects(data, "widgets") {
		id := d.readString(w, "id")
		if d.readString(w, "panelTypes") != "row" || id == "" {
			continue
		}
		row := &rowInfo{title: d.readString(w, "title")}
		// Some templates store panelMap[id] as a bare []widgetID instead of the
		// canonical {widgets, collapsed}. The frontend treats such a non-object
		// entry as "not collapsed" (see GridCardLayout), so read it leniently: a
		// non-map yields nil, which reads as not collapsed.
		pm, _ := panelMap[id].(map[string]any)
		if d.readBool(pm, "collapsed") {
			row.collapsed = true
			row.collapsedWidgets = d.readObjects(pm, "widgets")
		}
		rows[id] = row
	}
	return rows
}

// buildV2GridLayout builds one v2 grid. row is nil for the unnamed grid (no
// display); otherwise the grid takes the row's title and collapse state. Items
// are sorted by (y, x) and their y's normalized so the topmost sits at 0.
func (d *v1Decoder) buildV2GridLayout(row *rowInfo, items []map[string]any) Layout {
	d.sortByPosition(items)

	spec := dashboard.GridLayoutSpec{Items: make([]dashboard.GridItem, 0, len(items))}
	if row != nil {
		spec.Display = &dashboard.GridLayoutDisplay{
			Title:    row.title,
			Collapse: &dashboard.GridLayoutCollapse{Open: !row.collapsed},
		}
	}

	minY := 0
	if len(items) > 0 {
		minY = d.readInt(items[0], "y") // sorted by y, so the first item is topmost
	}
	for _, item := range items {
		spec.Items = append(spec.Items, dashboard.GridItem{
			X:       d.readInt(item, "x"),
			Y:       d.readInt(item, "y") - minY,
			Width:   d.readInt(item, "w"),
			Height:  d.readInt(item, "h"),
			Content: &common.JSONRef{Ref: fmt.Sprintf("#/spec/panels/%s", d.readString(item, "i"))},
		})
	}
	return Layout{Kind: dashboard.KindGridLayout, Spec: &spec}
}

func (d *v1Decoder) sortByPosition(items []map[string]any) {
	sort.SliceStable(items, func(i, j int) bool {
		if yi, yj := d.readInt(items[i], "y"), d.readInt(items[j], "y"); yi != yj {
			return yi < yj
		}
		return d.readInt(items[i], "x") < d.readInt(items[j], "x")
	})
}

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
func (d *v1Decoder) convertV1Layouts(data StorableDashboardData, panels map[string]*Panel) []Layout {
	layout := d.readObjects(data, "layout")
	if len(layout) == 0 {
		return nil
	}

	// react-grid-layout can persist the same widget id more than once. Drop the
	// duplicates, mirroring the frontend's getUpdatedLayout: keep the first
	// occurrence in stored order and discard the rest (the losing entry's
	// geometry is thrown away, not merged). Dedupe here, before sortByPosition,
	// so "first" means first-in-stored-order as the frontend sees it — not
	// topmost. Entries with no id are left for the main loop to drop.
	seenWidgetIds := make(map[string]bool, len(layout))
	dedupedLayouts := layout[:0]
	for _, item := range layout {
		if id := d.readString(item, "i"); id != "" {
			if seenWidgetIds[id] {
				continue
			}
			seenWidgetIds[id] = true
		}
		dedupedLayouts = append(dedupedLayouts, item)
	}
	layout = dedupedLayouts

	rows := d.extractRowsAndCollapsedWidgets(data)

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
		if id == "" || isWidgetCollapsed[id] {
			continue
		}
		if row, ok := rows[id]; ok {
			newRowHeader := &section{row: row, items: d.panelBackedItems(row.collapsedWidgets, panels)}
			sectionsWithHeader = append(sectionsWithHeader, newRowHeader)
			// A collapsed row owns only its stashed children; later panels → ungrouped.
			if row.collapsed {
				currentRowHeader = topSectionWithoutHeader
			} else {
				currentRowHeader = newRowHeader
			}
			continue
		}
		// Keep a layout entry only if the widget became a panel. A widget that was
		// skipped (unknown/EMPTY_WIDGET type, or failed conversion) or a stale
		// `layout` id with no widget at all (a deleted widget, or react-grid-layout's
		// "__dropping-elem__" drag placeholder) would otherwise emit a grid item
		// referencing a panel that does not exist. Rows are the exception, handled
		// above — they are section headers, not panels.
		if _, ok := panels[id]; !ok {
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

// panelBackedItems keeps only the layout items whose widget became a panel, so a
// grid never references a panel that was never created. Used for collapsed-row
// children (which bypass the main layout loop's per-item panel check).
func (d *v1Decoder) panelBackedItems(items []map[string]any, panels map[string]*Panel) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if id := d.readString(item, "i"); id != "" {
			if _, ok := panels[id]; ok {
				out = append(out, item)
			}
		}
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

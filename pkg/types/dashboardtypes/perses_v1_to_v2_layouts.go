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
				break
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
			// widgets in collapsed sectinos will be added when those sections' row widgets are handled.
			continue
		}
		if row, ok := rows[id]; ok {
			newRowHeader := &section{row: row, items: d.extractValidLayoutItemsForCollapsedSection(row.collapsedWidgets, panels)}
			sectionsWithHeader = append(sectionsWithHeader, newRowHeader)
			// A collapsed row owns only its stashed children; later panels → ungrouped.
			if row.collapsed {
				currentRowHeader = topSectionWithoutHeader
			} else {
				currentRowHeader = newRowHeader
			}
			continue
		}
		// Keep a layout entry only if its widget became a panel; otherwise (skipped
		// widget, deleted id, or the "__dropping-elem__" drag placeholder) it would
		// reference a panel that does not exist. Rows are handled above.
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

// extractValidLayoutItemsForCollapsedSection keeps only the collapsed-row children
// backed by a real panel, dropping ghosts. These come from panelMap and skip the
// main loop's per-item panel check, so a grid never references a missing panel.
func (d *v1Decoder) extractValidLayoutItemsForCollapsedSection(items []map[string]any, panels map[string]*Panel) []map[string]any {
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
// display); otherwise the grid takes the row's title and collapse state. Items are
// sorted by (y, x) then vertically compacted (see compactGridItemsVertically).
func (d *v1Decoder) buildV2GridLayout(row *rowInfo, items []map[string]any) Layout {
	d.sortByPosition(items)

	spec := dashboard.GridLayoutSpec{Items: make([]dashboard.GridItem, 0, len(items))}
	if row != nil {
		spec.Display = &dashboard.GridLayoutDisplay{
			Title:    clipName(row.title, MaxLayoutTitleLen),
			Collapse: &dashboard.GridLayoutCollapse{Open: !row.collapsed},
		}
	}

	for _, item := range items {
		spec.Items = append(spec.Items, dashboard.GridItem{
			X:       d.readInt(item, "x"),
			Y:       d.readInt(item, "y"),
			Width:   d.readInt(item, "w"),
			Height:  d.readInt(item, "h"),
			Content: &common.JSONRef{Ref: fmt.Sprintf("#/spec/panels/%s", d.readString(item, "i"))},
		})
	}
	compactGridItemsVertically(spec.Items)
	return Layout{Kind: dashboard.KindGridLayout, Spec: &spec}
}

// compactGridItemsVertically mirrors react-grid-layout's correctBounds+compact
// (compactType "vertical", allowOverlap false): clamp each item into the grid (x,y>=0;
// x+width<=cols by shifting left), then move sorted-first items up to fill space and
// down past collisions. Fixes overlaps, gaps, and out-of-bounds coords so the migrated
// grid matches the v1 UI and passes v2 validation.
func compactGridItemsVertically(items []dashboard.GridItem) {
	collides := func(a, b dashboard.GridItem) bool {
		return a.X < b.X+b.Width && b.X < a.X+a.Width && a.Y < b.Y+b.Height && b.Y < a.Y+a.Height
	}
	firstCollision := func(l dashboard.GridItem, placed []dashboard.GridItem) (dashboard.GridItem, bool) {
		for _, p := range placed {
			if collides(l, p) {
				return p, true
			}
		}
		return dashboard.GridItem{}, false
	}
	for i := range items {
		l := items[i]
		if l.X+l.Width > gridColumnCount { // overflows right → shift left to fit
			l.X = gridColumnCount - l.Width
		}
		if l.X < 0 {
			l.X = 0
		}
		if l.Y < 0 {
			l.Y = 0
		}
		for l.Y > 0 { // move up to fill space above
			up := l
			up.Y--
			if _, hit := firstCollision(up, items[:i]); hit {
				break
			}
			l.Y--
		}
		for { // then down past any collision with an already-placed item
			c, hit := firstCollision(l, items[:i])
			if !hit {
				break
			}
			l.Y = c.Y + c.Height
		}
		items[i] = l
	}
}

func (d *v1Decoder) sortByPosition(items []map[string]any) {
	sort.SliceStable(items, func(i, j int) bool {
		if yi, yj := d.readInt(items[i], "y"), d.readInt(items[j], "y"); yi != yj {
			return yi < yj
		}
		return d.readInt(items[i], "x") < d.readInt(items[j], "x")
	})
}

package dashboardtypes

import (
	"sort"
	"strings"

	"github.com/perses/spec/go/common"
	"github.com/perses/spec/go/dashboard"
)

// panelRefPrefix is the JSON-ref prefix a grid item uses to point at a panel:
// "#/spec/panels/<id>".
const panelRefPrefix = "#/spec/panels/"

// sanitizePanelID rewrites a widget id to something valid in a panel $ref. Perses
// accepts only [a-zA-Z0-9_-] per ref segment (common.jsonRefMatching), so every
// other rune (em dash, spaces, dots, unicode, …) is mapped to a hyphen.
func sanitizePanelID(id string) string {
	return strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '_', r == '-':
			return r
		default:
			return '-'
		}
	}, id)
}

// sanitizeWidgetIDs rewrites every widget id in the raw v1 data — widgets[].id,
// layout[].i, panelMap keys and their widgets[].i — through sanitizePanelID, so a
// panel's map key and the layout $ref pointing at it stay identical (an illegal char
// in one but not the other would dangle the ref). Runs before panels/layouts build.
func sanitizeWidgetIDs(data StorableDashboardData) {
	sanitizeField := func(raw any, field string) {
		items, _ := raw.([]any)
		for _, it := range items {
			if m, ok := it.(map[string]any); ok {
				if s, ok := m[field].(string); ok {
					m[field] = sanitizePanelID(s)
				}
			}
		}
	}
	sanitizeField(data["widgets"], "id")
	sanitizeField(data["layout"], "i")
	if panelMap, ok := data["panelMap"].(map[string]any); ok {
		for key, v := range panelMap {
			if s := sanitizePanelID(key); s != key {
				panelMap[s] = v
				delete(panelMap, key)
			}
			if m, ok := v.(map[string]any); ok {
				sanitizeField(m["widgets"], "i")
			}
		}
	}
}

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

	// react-grid-layout can persist the same widget id more than once. Keep the first
	// occurrence in stored order (mirroring getUpdatedLayout — the losing entry's
	// geometry is discarded, not merged) and drop the rest. Dedupe before sortByPosition
	// so "first" means first-in-stored-order, not topmost. Entries with no id are left
	// for the main loop to drop.
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

	// ids placed directly in `layout`. A collapsed child also listed here is rendered from
	// layout (the open section), so it's dropped from its collapsed section below.
	placedInLayout := make(map[string]bool, len(layout))
	for _, item := range layout {
		if id := d.readString(item, "i"); id != "" {
			placedInLayout[id] = true
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
		if id == "" {
			continue
		}
		if row, ok := rows[id]; ok {
			newRowHeader := &section{row: row, items: d.extractValidLayoutItemsForCollapsedSection(row.collapsedWidgets, panels, placedInLayout)}
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

// retainPlacedWidgets drops widgets the v1 layout never places, returning the
// filtered widgets. v1 doesn't render an unplaced widget, so converting it — and
// noting any problems it has — is pure noise; filter before conversion so only
// rendered widgets reach convertV1Panels. A non-array widgets value is returned
// untouched for convertV1Panels to flag; non-map entries are kept so it still
// flags them as malformed.
func retainPlacedWidgets(data StorableDashboardData) any {
	widgets, ok := data["widgets"].([]any)
	if !ok {
		return data["widgets"]
	}
	placed := placedWidgetIDs(data)
	kept := make([]any, 0, len(widgets))
	for _, w := range widgets {
		wm, ok := w.(map[string]any)
		if !ok {
			kept = append(kept, w) // malformed entry — leave it for convertV1Panels to note
			continue
		}
		if id, _ := wm["id"].(string); placed[id] {
			kept = append(kept, w)
		}
	}
	return kept
}

// placedWidgetIDs returns the set of widget ids the v1 layout actually renders:
// every id in `layout`, plus the collapsed-row children stashed in panelMap.
// Read leniently (no malformed notes) — convertV1Layouts re-reads these and
// reports any genuine problems.
func placedWidgetIDs(data StorableDashboardData) map[string]bool {
	ids := make(map[string]bool)
	if layout, ok := data["layout"].([]any); ok {
		for _, e := range layout {
			if m, ok := e.(map[string]any); ok {
				if i, ok := m["i"].(string); ok && i != "" {
					ids[i] = true
				}
			}
		}
	}
	if panelMap, ok := data["panelMap"].(map[string]any); ok {
		for _, v := range panelMap {
			m, ok := v.(map[string]any)
			if !ok {
				continue
			}
			widgets, ok := m["widgets"].([]any)
			if !ok {
				continue
			}
			for _, w := range widgets {
				if wm, ok := w.(map[string]any); ok {
					if i, ok := wm["i"].(string); ok && i != "" {
						ids[i] = true
					}
				}
			}
		}
	}
	return ids
}

// extractValidLayoutItemsForCollapsedSection keeps only the collapsed-row children
// backed by a real panel and not already placed in `layout`, dropping ghosts and any
// child the open layout renders instead. These come from panelMap and skip the main
// loop's per-item panel check, so a grid never references a missing or twice-placed panel.
func (d *v1Decoder) extractValidLayoutItemsForCollapsedSection(items []map[string]any, panels map[string]*Panel, placedInLayout map[string]bool) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	seen := make(map[string]bool, len(items))
	for _, item := range items {
		id := d.readString(item, "i")
		if id == "" {
			continue
		}
		if _, ok := panels[id]; !ok {
			continue
		}
		if placedInLayout[id] || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, item)
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
		// Read id directly (not via readString): a non-string id is skipped silently by
		// convertV1Panels, so flagging it malformed here would fail the migration for a
		// widget that's already been dropped.
		id, _ := w["id"].(string)
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
		id := d.readString(item, "i")
		spec.Items = append(spec.Items, dashboard.GridItem{
			X:      d.readInt(item, "x"),
			Y:      d.readInt(item, "y"),
			Width:  d.readInt(item, "w"),
			Height: d.readInt(item, "h"),
			// Path mirrors what JSONRef.validate derives on decode (each "/segment"
			// of the ref; the leading "#" captures nothing).
			Content: &common.JSONRef{Ref: panelRefPrefix + id, Path: []string{"spec", "panels", id}},
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

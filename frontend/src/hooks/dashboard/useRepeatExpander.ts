import { useMemo } from 'react';
import { Layout } from 'react-grid-layout';
import {
	IDashboardVariable,
	RepeatConfig,
	WidgetRow,
	Widgets,
} from 'types/api/dashboard/getAll';

interface ExpandedResult {
	widgets: (Widgets | WidgetRow)[];
	layout: Layout[];
}

/**
 * Expands panels that have a `repeat` config into N clones,
 * one per value of the referenced dashboard variable.
 * Clones are runtime-only and never persisted.
 */
export function useRepeatExpander(
	widgets: (Widgets | WidgetRow)[] | undefined,
	layout: Layout[],
	variables: Record<string, IDashboardVariable>,
): ExpandedResult {
	return useMemo(() => {
		if (!widgets) return { widgets: [], layout: [] };

		const expandedWidgets: (Widgets | WidgetRow)[] = [];
		const expandedLayout: Layout[] = [];

		for (const widget of widgets) {
			// WidgetRow and widgets without repeat pass through unchanged
			if (!('repeat' in widget) || !widget.repeat) {
				expandedWidgets.push(widget);
				const layoutItem = layout.find((l) => l.i === widget.id);
				if (layoutItem) expandedLayout.push(layoutItem);
				continue;
			}

			const varName = widget.repeat.variable;
			const variable = variables[varName];
			if (!variable) {
				expandedWidgets.push(widget);
				const layoutItem = layout.find((l) => l.i === widget.id);
				if (layoutItem) expandedLayout.push(layoutItem);
				continue;
			}

			const values = getVariableValues(variable);

			// Find template layout — either the original id or the first repeat clone
			// (handles case where expanded layout was previously persisted)
			const templateLayout =
				layout.find((l) => l.i === widget.id) ||
				layout.find((l) => l.i.startsWith(`${widget.id}__repeat_`));

			if (!templateLayout || values.length === 0) {
				expandedWidgets.push(widget);
				if (templateLayout) expandedLayout.push(templateLayout);
				continue;
			}

			// Use the template's dimensions but normalize to the original widget id
			const baseLayout = { ...templateLayout, i: widget.id };

			// Clone panel for each variable value
			values.forEach((value, index) => {
				const cloneId = `${widget.id}__repeat_${index}`;
				const clonedWidget = cloneWidgetWithValue(
					widget,
					varName,
					value,
					cloneId,
				);
				expandedWidgets.push(clonedWidget);

				const clonedLayout = calculateCloneLayout(
					baseLayout,
					index,
					widget.repeat as RepeatConfig,
					cloneId,
				);
				expandedLayout.push(clonedLayout);
			});
		}

		return { widgets: expandedWidgets, layout: expandedLayout };
	}, [widgets, layout, variables]);
}

function getVariableValues(variable: IDashboardVariable): string[] {
	const { selectedValue } = variable;

	// "ALL" selected — SigNoz stores allSelected=true with selectedValue as array
	if (variable.allSelected || selectedValue === '__all__') {
		if (Array.isArray(selectedValue) && selectedValue.length > 0) {
			return selectedValue.map(String).filter(Boolean);
		}
		if (variable.customValue) {
			return variable.customValue
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		return [];
	}

	if (Array.isArray(selectedValue)) {
		return selectedValue.map(String).filter(Boolean);
	}

	if (
		selectedValue !== null &&
		selectedValue !== undefined &&
		selectedValue !== ''
	) {
		return [String(selectedValue)];
	}

	return [];
}

function cloneWidgetWithValue(
	widget: Widgets,
	varName: string,
	value: string,
	cloneId: string,
): Widgets {
	const clone = JSON.parse(JSON.stringify(widget)) as Widgets;
	clone.id = cloneId;

	// Substitute variable in title
	clone.title = String(clone.title || '')
		.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value)
		.replace(new RegExp(`\\{\\{\\.${varName}\\}\\}`, 'g'), value)
		.replace(new RegExp(`\\$${varName}`, 'g'), value);

	// Substitute in queries
	substituteInQueries(clone, varName, value);

	// Remove repeat config from clone to prevent infinite expansion
	delete clone.repeat;

	return clone;
}

function substituteInQueries(
	widget: Widgets,
	varName: string,
	value: string,
): void {
	const { query } = widget;
	if (!query) return;

	const patterns = [
		new RegExp(`\\{\\{\\.${varName}\\}\\}`, 'g'),
		new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
		new RegExp(`\\$${varName}`, 'g'),
	];

	const replace = (text: string): string =>
		patterns.reduce((acc, pat) => acc.replace(pat, value), text);

	// PromQL
	if ((query as any).promql) {
		for (const p of (query as any).promql) {
			if (p.query) p.query = replace(p.query);
		}
	}

	// ClickHouse SQL
	if ((query as any).clickhouse_sql) {
		for (const c of (query as any).clickhouse_sql) {
			if (c.query) c.query = replace(c.query);
		}
	}

	// Query Builder filters
	if ((query as any).builder?.queryData) {
		for (const qd of (query as any).builder.queryData) {
			if (qd.filters?.items) {
				for (const item of qd.filters.items) {
					if (typeof item.value === 'string') {
						item.value = replace(item.value);
					}
				}
			}
		}
	}
}

function calculateCloneLayout(
	template: Layout,
	index: number,
	repeat: RepeatConfig,
	cloneId: string,
): Layout {
	if (repeat.direction === 'vertical') {
		return {
			...template,
			i: cloneId,
			y: template.y + index * template.h,
			static: false,
		};
	}

	// Horizontal
	const maxPerRow = repeat.maxPerRow || 2;
	const row = Math.floor(index / maxPerRow);
	const col = index % maxPerRow;
	const colWidth = Math.floor(template.w / maxPerRow);

	return {
		...template,
		i: cloneId,
		x: template.x + col * colWidth,
		y: template.y + row * template.h,
		w: colWidth,
		static: false,
	};
}

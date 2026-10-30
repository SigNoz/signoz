/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import type { Locator } from '@playwright/test';

import type { ConsoleWatch } from '../../helpers/common';

/** The golden dataset has only Sums; these are seeded per worker. */
export interface MetricTypes {
	gauge: string;
	histogram: string;
}

/** One entry of a v5 `query_range` body's `compositeQuery.queries`. */
export interface V5Query {
	type: string;
	spec: {
		name?: string;
		signal?: string;
		disabled?: boolean;
		filter?: { expression?: string };
		aggregations?: {
			expression?: string;
			metricName?: string;
			timeAggregation?: string;
			spaceAggregation?: string;
			reduceTo?: string;
		}[];
		groupBy?: { name: string }[];
		having?: { expression?: string };
		order?: { key: { name: string }; direction: string }[];
		limit?: number;
		stepInterval?: number;
		[key: string]: unknown;
	};
}

export interface V5Body {
	requestType: string;
	compositeQuery: { queries: V5Query[] };
}

export interface FilterEditor {
	root(): Locator;
	/** The contenteditable CodeMirror surface. */
	content(): Locator;
	/** Replaces the expression by typing it key by key. */
	type(text: string): Promise<void>;
	/** Appends at the caret without clearing. */
	append(text: string): Promise<void>;
	clear(): Promise<void>;
	press(key: string): Promise<void>;
	/** The document text, placeholder excluded, lines joined with `\n`. */
	expression(): Promise<string>;
	lineCount(): Locator;
	/** The open autocomplete popup. */
	suggestions(): Locator;
	/**
	 * Ctrl+Space: opens the popup at the caret. Typing opens it only once the
	 * debounced key fetch answers, which a loaded stack can delay past a test's
	 * next step.
	 */
	openSuggestions(): Promise<void>;
	suggestion(label: string | RegExp): Locator;
}

export interface QueryBlock {
	root(): Locator;
	filter: FilterEditor;
	/** The filter's status icon: shown only while unfocused and non-empty. */
	filterStatus(): Locator;
	aggregation: FilterEditor;
	/** The aggregation's "every … Seconds" input. */
	step(): Locator;
	metric: MetricControls;
	addOns: AddOns;
	/** The "…" menu: offered only where several queries are allowed. */
	actions(): Locator;
	/** A row of the open "…" menu. */
	menuItem(action: 'clone' | 'delete'): Locator;
	clone(): Promise<void>;
	delete(): Promise<void>;
	toggleVisibility(): Promise<void>;
	collapse(): Promise<void>;
	/** The data-source dropdown's value; only on hosts that let it change. */
	signal(): Locator;
	setSignal(label: 'Logs' | 'Traces' | 'Metrics'): Promise<void>;
}

export interface FormulaBlock {
	root(): Locator;
	expression(): Locator;
	legend(): Locator;
	delete(): Promise<void>;
}

/** `query-add-on-<field>` toggle values: a documented DOM contract. */
export type AddOnField =
	| 'group_by'
	| 'having'
	| 'order_by'
	| 'limit'
	| 'legend_format'
	| 'reduce_to';

export interface AddOns {
	/** The toggle row; its children name the add-ons on offer. */
	toggles(): Locator;
	/** Idempotent: leaves an already-open add-on open. */
	open(field: AddOnField): Promise<void>;
	content(field: AddOnField): Locator;
	groupBy: {
		/** Types `key` and picks the suggestion with that exact name. */
		add(key: string): Promise<void>;
		remove(key: string): Promise<void>;
		/** The selected keys, in order. */
		values(): Promise<string[]>;
	};
	having: FilterEditor;
	limit(): Locator;
	legend(): Locator;
	reduceTo: {
		/** The selected value. */
		value(): Locator;
		set(label: string): Promise<void>;
	};
}

/** The metrics aggregation section: metric picker plus time/space selects. */
export interface MetricControls {
	select(name: string): Promise<void>;
	/** The metric name input. */
	input(): Locator;
	/** The selected value. Absent for histograms. */
	timeAggregation(): Locator;
	/** The selected value. */
	spaceAggregation(): Locator;
	setTimeAggregation(label: string): Promise<void>;
	setSpaceAggregation(label: string): Promise<void>;
	/** Labels offered by the space-aggregation select, as shown. */
	spaceOptions(): Promise<string[]>;
}

export interface QuickFilterValue {
	checkbox(): Locator;
	/** Toggles the value; returns the query_range bodies the toggle fired. */
	toggle(): Promise<V5Body[]>;
}

/** The explorer's tab, carried in the `panelTypes` param. */
export type ExplorerView = 'list' | 'graph' | 'table';

export interface OpenOptions {
	/** Serialised the way the app writes it. */
	query?: unknown;
	/** A `compositeQuery` value sent as given, for malformed input. */
	raw?: string;
	view?: ExplorerView;
}

export interface QueryBuilderDriver {
	/**
	 * Resolves once the page's own first query_range has answered: the explorer
	 * rewrites its URL and re-mounts the builder until then, which drops
	 * keystrokes. Returns the bodies that load fired.
	 */
	openExplorer(path: string, options?: OpenOptions): Promise<V5Body[]>;
	query(name: string): QueryBlock;
	/** Adds the next query (B, C, …) and waits for its block. */
	addQuery(name: string): Promise<QueryBlock>;
	/** Builder query names, top to bottom. */
	queryNames(): Promise<string[]>;
	/** Panel-editor query-type tab, by its queryType (`builder`, `promql`, …). */
	tab(queryType: string): Locator;
	promql(): Locator;
	formula(name: string): FormulaBlock;
	addFormula(name: string): Promise<FormulaBlock>;
	traceOperator: {
		root(): Locator;
		/** "Add Trace Matching": offered on traces hosts that allow it. */
		addButton(): Locator;
		add(): Promise<void>;
		remove(): Promise<void>;
		editor: FilterEditor;
	};
	/**
	 * Explorer "Add to dashboard": picks the dashboard titled `title` and waits
	 * for the new-panel editor the export navigates to.
	 */
	addToDashboard(title: string): Promise<void>;
	runButton(): Locator;
	/** The logs explorer's results area, below the builder. */
	logsResults(): Locator;
	/** Clicks Run; returns every query_range body the click fired. */
	run(): Promise<V5Body[]>;
	/**
	 * Clicks Run until `read()` equals `expected`. For panel-editor structural
	 * edits, whose draft can lag the DOM: an early Run is a cache hit that
	 * sends nothing. Never clicks while the button is Cancel.
	 */
	rerunUntil(read: () => unknown, expected: unknown): Promise<void>;
	/**
	 * Ctrl/Cmd+Enter from the focused field; returns the fired bodies. Waits two
	 * frames first: editor changes reach React state on its next scheduler task,
	 * and a keypress inside the same frame as the last keystroke reads the
	 * previous render — a gap no person can produce.
	 */
	runShortcut(): Promise<V5Body[]>;
	/** A value in an explorer's checkbox quick filter, by its header title. */
	quickFilter(title: string, value: string): QuickFilterValue;
	/** The spec of query `name` in the first body that has it. */
	spec(bodies: V5Body[], name: string): V5Query['spec'];
	/** Every query_range body sent since the test started. */
	sent(): V5Body[];
	/**
	 * Query `name`'s spec in the newest body that has it, whatever sent it. The
	 * panel editor fetches on structural edits, so Run after one can be a cache
	 * hit that sends nothing: poll this rather than waiting on Run.
	 */
	latest(name: string): V5Query['spec'] | undefined;
	/** The URL's `compositeQuery`, parsed. */
	urlQuery(): Record<string, unknown> | null;
	console: ConsoleWatch;
}

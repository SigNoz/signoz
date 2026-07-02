/** Where a context-link variable comes from — shown as the right-hand label in the popover. */
export type VariableSource =
	| 'Global timestamp'
	| 'Query variable'
	| 'Dashboard variable';

/** One entry in the context-link variable autocomplete. */
export interface VariableItem {
	/** Bare variable name without braces, e.g. `timestamp_start`, `_service_name`, `env`. */
	name: string;
	source: VariableSource;
}

/** A single decoded key/value pair parsed from (or written back to) a URL query string. */
export interface UrlParam {
	key: string;
	value: string;
}

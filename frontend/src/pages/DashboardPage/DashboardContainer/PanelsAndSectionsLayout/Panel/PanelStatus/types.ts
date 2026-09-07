/** Which kind of non-fatal panel status is being surfaced in the header. */
export type PanelStatusVariant = 'error' | 'warning';

/**
 * Normalized status shape that both an API error and a query warning adapt into,
 * so a single popover can render either. Mirrors the backend `ErrorV2`/`Warning`
 * envelope fields (code + summary + optional docs link + per-item messages).
 */
export interface PanelStatusDetail {
	/** Status code shown as the heading. Only present in error cases. */
	code?: string;
	/** Human-readable summary line. */
	message: string;
	/** Optional docs link; renders an "Open Docs" action when present. */
	docsUrl?: string;
	/** Additional per-item messages listed under the summary. */
	messages: string[];
}

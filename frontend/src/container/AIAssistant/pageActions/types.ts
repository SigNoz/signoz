export type JSONSchemaProperty =
	| { type: 'string'; description?: string; enum?: string[] }
	| { type: 'number'; description?: string }
	| { type: 'boolean'; description?: string }
	| {
			type: 'array';
			description?: string;
			items: JSONSchemaProperty | JSONSchemaObject;
	  }
	| {
			type: 'object';
			description?: string;
			properties?: Record<string, JSONSchemaProperty>;
			required?: string[];
	  };

export type JSONSchemaObject = {
	type: 'object';
	properties: Record<string, JSONSchemaProperty>;
	required?: string[];
};

export interface ActionResult {
	/** Short human-readable outcome shown after the action completes. */
	summary: string;
	/** Optional structured data the block can display. */
	data?: Record<string, unknown>;
}

/**
 * Describes a single action a page exposes to the AI Assistant.
 * Pages register these via `usePageActions`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PageAction<TParams = Record<string, any>> {
	/**
	 * Stable dot-namespaced identifier — e.g. "logs.runQuery", "dashboard.create".
	 * The AI uses this to target the correct action.
	 */
	id: string;

	/**
	 * Natural-language description sent in the PAGE_CONTEXT block.
	 * The AI uses this to decide which action to invoke.
	 */
	description: string;

	/**
	 * JSON Schema (draft-07) describing the parameters accepted by this action.
	 * Sent to the AI so it can generate structurally valid calls.
	 */
	parameters: JSONSchemaObject;

	/**
	 * Executes the action. Resolves with a result summary on success.
	 * Rejects with an Error if the action cannot be completed.
	 */
	execute: (params: TParams) => Promise<ActionResult>;

	/**
	 * When true, ActionBlock executes the action immediately on mount without
	 * showing a confirmation card. Use for low-risk, reversible actions where
	 * the user explicitly requested the change (e.g. updating a query filter).
	 * Default: false (shows Accept / Dismiss card).
	 */
	autoApply?: boolean;

	/**
	 * Optional: returns a snapshot of the current page state to include in
	 * the PAGE_CONTEXT block. Called fresh at message-send time.
	 */
	getContext?: () => unknown;
}

/**
 * Serialisable version of PageAction (no function references).
 * Safe to embed in the API payload.
 */
export interface PageActionDescriptor {
	id: string;
	description: string;
	parameters: JSONSchemaObject;
	/** Context snapshot returned by PageAction.getContext() */
	context?: unknown;
}

/**
 * The JSON payload the AI emits inside an ```ai-action``` fenced block
 * when it wants to invoke an action.
 */
export interface AIActionBlock {
	/** Must match a registered PageAction.id */
	actionId: string;
	/** One-sentence explanation shown in the confirmation card. */
	description: string;
	/** Parameters chosen by the AI — validated against the action's JSON Schema. */
	parameters: Record<string, unknown>;
}

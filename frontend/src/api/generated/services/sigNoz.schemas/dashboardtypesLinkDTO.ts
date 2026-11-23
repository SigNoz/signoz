/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesLinkDTO {
	/**
	 * @type string
	 * @description The link label.
	 */
	name?: string;
	/**
	 * @type boolean
	 * @description Whether dashboard variable values are substituted into url before opening it.
	 */
	renderVariables?: boolean;
	/**
	 * @type boolean
	 * @description Whether the link opens in a new tab.
	 */
	targetBlank?: boolean;
	/**
	 * @type string
	 * @description Hover text for the link. Stored, but not shown by the UI.
	 */
	tooltip?: string;
	/**
	 * @type string
	 * @description The link target. May reference dashboard variables as {{name}} when renderVariables is true.
	 */
	url?: string;
}

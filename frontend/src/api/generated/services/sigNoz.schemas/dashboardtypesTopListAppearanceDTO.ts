/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesTopListAppearanceDTO {
	/**
	 * @type string
	 * @description Hex color of every bar; a matching background threshold overrides it.
	 */
	barColor: string;
	/**
	 * @type boolean
	 * @description Numbers each row by its position in the list.
	 */
	showRank?: boolean;
	/**
	 * @type boolean
	 * @description Shows each row's share of the listed rows' total.
	 */
	showShare?: boolean;
}

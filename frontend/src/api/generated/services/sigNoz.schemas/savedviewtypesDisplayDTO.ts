/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface SavedviewtypesDisplayDTO {
	/**
	 * @type string
	 * @description A CSS color such as a hex code, shown as the view's color in the explorer view picker; the saved views panel does not use it. Empty leaves the default.
	 */
	color?: string;
	/**
	 * @type string
	 * @description The row font size in list views: small, medium or large. Empty leaves the explorer default.
	 */
	fontSize?: string;
	/**
	 * @type string
	 * @description The list rendering mode in the logs explorer: raw, table or list. Empty leaves the explorer default.
	 */
	format?: string;
	/**
	 * @type integer
	 * @description The number of lines shown per row before the body is truncated in logs list views. 0 leaves the explorer default.
	 */
	maxLines?: number;
}

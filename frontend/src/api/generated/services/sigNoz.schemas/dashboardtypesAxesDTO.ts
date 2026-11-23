/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesAxesDTO {
	/**
	 * @type boolean
	 * @description Whether the Y axis uses a logarithmic scale.
	 */
	isLogScale?: boolean;
	/**
	 * @type number,null
	 * @description The highest value the Y axis always shows; data above it still extends the axis. Null fits the data.
	 */
	softMax?: number | null;
	/**
	 * @type number,null
	 * @description The lowest value the Y axis always shows; data below it still extends the axis. Null fits the data.
	 */
	softMin?: number | null;
}

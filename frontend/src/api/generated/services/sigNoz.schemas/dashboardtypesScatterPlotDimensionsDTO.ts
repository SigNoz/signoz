/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface DashboardtypesScatterPlotDimensionsDTO {
	/**
	 * @type array,null
	 * @description Group-by label names (e.g. k8s.namespace.name) whose combined values color the dots and drive the legend. Empty colors by every group-by label.
	 */
	colorBy?: string[] | null;
	/**
	 * @type string
	 * @description Value column key that scales each dot's area between chartAppearance.points.minSize and maxSize. Empty draws every dot at chartAppearance.points.size, as does a dot with no value.
	 */
	sizeBy?: string;
	/**
	 * @type string
	 * @description Value column key (queryName, or queryName.expression for a multi-aggregation query) plotted on the x axis. Empty, or a key the result lacks, uses the first value column.
	 */
	x?: string;
	/**
	 * @type string
	 * @description Value column key plotted on the y axis. Empty, or a key the result lacks, uses the first value column x does not use.
	 */
	y?: string;
}

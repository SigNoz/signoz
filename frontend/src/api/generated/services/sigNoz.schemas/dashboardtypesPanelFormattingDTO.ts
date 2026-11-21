/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPrecisionOptionDTO } from './dashboardtypesPrecisionOptionDTO';

export interface DashboardtypesPanelFormattingDTO {
	/**
	 * @description Decimal places shown: 0, 1, 2 (default), 3, 4 or full.
	 */
	decimalPrecision?: DashboardtypesPrecisionOptionDTO;
	/**
	 * @type string
	 * @description The display unit of the values, such as By, ms, s, percent or percentunit. Use percent for values already expressed as percentages (95 displays as 95%) and percentunit for fractions (0.95 displays as 95%). Empty shows plain numbers.
	 */
	unit?: string;
}

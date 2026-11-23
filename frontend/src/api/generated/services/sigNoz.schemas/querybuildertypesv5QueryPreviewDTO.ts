/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5PreviewStatementDTO } from './querybuildertypesv5PreviewStatementDTO';

export interface Querybuildertypesv5QueryPreviewDTO {
	/**
	 * @description The rendering error when valid is false, otherwise null.
	 */
	error: unknown;
	/**
	 * @type array
	 * @description The rendered statements, returned only when verbose is true: one per PromQL metric selector, one for builder, ClickHouse SQL and trace operator queries, none for formulas. Empty otherwise.
	 */
	statements: Querybuildertypesv5PreviewStatementDTO[];
	/**
	 * @type boolean
	 * @description Whether the query rendered without error.
	 */
	valid: boolean;
	/**
	 * @type array
	 * @description Warnings raised while rendering the query.
	 */
	warnings: string[];
}

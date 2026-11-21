/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesLabelPairDTO } from './ruletypesLabelPairDTO';
import type { RuletypesListableRuleDTO } from './ruletypesListableRuleDTO';

export interface RuletypesListableRulesDTO {
	/**
	 * @type array
	 * @description Organization-wide label key and value pair suggestions for building filters, independent of the current filter and page, capped at 1000 distinct pairs.
	 */
	labels: RuletypesLabelPairDTO[];
	/**
	 * @type array
	 * @description The keys the query filter language reserves, which cannot be used as label names in a query.
	 */
	reservedKeywords: string[];
	/**
	 * @type array
	 * @description The page of rules matching the filter.
	 */
	rules: RuletypesListableRuleDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of rules matching the filter across all pages.
	 */
	total: number;
}

/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5VariableItemDTOValueOneOfItem } from './querybuildertypesv5VariableItemDTOValueOneOfItem';

/**
 * The selected value: a string, number or boolean, or a list of them for multi-select variables. The string __all__ is special only for dynamic variables in builder filters and PromQL, where it removes the condition that references the variable; query, custom and text variables, and ClickHouse SQL for every type, substitute it literally.
 */
export type Querybuildertypesv5VariableItemDTOValue =
	| string
	| number
	| boolean
	| Querybuildertypesv5VariableItemDTOValueOneOfItem[];

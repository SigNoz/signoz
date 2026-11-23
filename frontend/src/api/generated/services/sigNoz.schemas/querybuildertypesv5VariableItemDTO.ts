/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5VariableItemDTOValue } from './querybuildertypesv5VariableItemDTOValue';
import type { Querybuildertypesv5VariableTypeDTO } from './querybuildertypesv5VariableTypeDTO';

export interface Querybuildertypesv5VariableItemDTO {
	/**
	 * @description The kind of dashboard variable: query, dynamic, custom or text.
	 */
	type?: Querybuildertypesv5VariableTypeDTO;
	/**
	 * @description The selected value: a string, number or boolean, or a list of them for multi-select variables. The string __all__ is special only for dynamic variables in builder filters and PromQL, where it removes the condition that references the variable; query, custom and text variables, and ClickHouse SQL for every type, substitute it literally.
	 */
	value?: Querybuildertypesv5VariableItemDTOValue;
}

/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5VariableItemDTO } from './querybuildertypesv5VariableItemDTO';

/**
 * Dashboard variable values keyed by variable name. Builder filters substitute only the $name form and leave a quoted {{name}} unchanged; PromQL and ClickHouse SQL substitute $name, {{name}}, [[name]] and the Go template form {{.name}}.
 */
export type Querybuildertypesv5QueryRangeRequestDTOVariables = {
	[key: string]: Querybuildertypesv5VariableItemDTO;
};

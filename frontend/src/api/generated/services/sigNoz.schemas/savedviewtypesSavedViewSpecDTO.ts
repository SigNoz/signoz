/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryEnvelopeDTO } from './querybuildertypesv5QueryEnvelopeDTO';
import type { Querybuildertypesv5RequestTypeDTO } from './querybuildertypesv5RequestTypeDTO';
import type { SavedviewtypesDisplayDTO } from './savedviewtypesDisplayDTO';
import type { SavedviewtypesPanelTypeDTO } from './savedviewtypesPanelTypeDTO';
import type { TelemetrytypesTelemetryFieldKeyDTO } from './telemetrytypesTelemetryFieldKeyDTO';

export interface SavedviewtypesSavedViewSpecDTO {
	/**
	 * @description Rendering preferences for list panels. All fields are optional.
	 */
	display?: SavedviewtypesDisplayDTO;
	/**
	 * @type string
	 * @description The human readable title shown in the explorer. It may differ from the machine name and need not be unique.
	 */
	displayName: string;
	/**
	 * @description The explorer panel the view renders as: list, graph, table, value or trace.
	 */
	panelType: SavedviewtypesPanelTypeDTO;
	/**
	 * @type array
	 * @description The query envelopes the view runs, in the v5 query builder shape. At least one is required and the set is validated for the requestType.
	 */
	queries: Querybuildertypesv5QueryEnvelopeDTO[];
	/**
	 * @description The query_range request type the panel issues: raw for list panels, time_series for graphs, scalar for table and value panels, trace for trace panels.
	 */
	requestType: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @type array
	 * @description The columns shown in list panels, each a field key with name and optionally signal, fieldContext and fieldDataType. Send explicit columns for list views: an empty array yields no trace columns and only the required log columns. Use an empty array for graph views.
	 */
	selectedFields?: TelemetrytypesTelemetryFieldKeyDTO[];
}

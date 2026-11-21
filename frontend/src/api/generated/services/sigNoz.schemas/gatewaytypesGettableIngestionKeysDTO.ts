/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { GatewaytypesIngestionKeyDTO } from './gatewaytypesIngestionKeyDTO';
import type { GatewaytypesPaginationDTO } from './gatewaytypesPaginationDTO';

export interface GatewaytypesGettableIngestionKeysDTO {
	_pagination?: GatewaytypesPaginationDTO;
	/**
	 * @type array,null
	 */
	keys?: GatewaytypesIngestionKeyDTO[] | null;
}

/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { GatewaytypesLimitConfigDTO } from './gatewaytypesLimitConfigDTO';
import type { GatewaytypesLimitMetricDTO } from './gatewaytypesLimitMetricDTO';

export interface GatewaytypesLimitDTO {
	config?: GatewaytypesLimitConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	created_at?: string;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type string
	 */
	key_id?: string;
	metric?: GatewaytypesLimitMetricDTO;
	/**
	 * @type string
	 */
	signal?: string;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updated_at?: string;
}

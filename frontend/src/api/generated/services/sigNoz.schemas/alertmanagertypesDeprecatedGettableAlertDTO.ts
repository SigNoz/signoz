/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ModelLabelSetDTO } from './modelLabelSetDTO';
import type { TypesAlertStatusDTO } from './typesAlertStatusDTO';

export interface AlertmanagertypesDeprecatedGettableAlertDTO {
	annotations?: ModelLabelSetDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	endsAt?: string;
	/**
	 * @type string
	 * @description The alert fingerprint, a hash of its label set.
	 */
	fingerprint?: string;
	/**
	 * @type string
	 */
	generatorURL?: string;
	labels?: ModelLabelSetDTO;
	/**
	 * @type array,null
	 * @description The display names of the channels the alert is routed to.
	 */
	receivers?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	startsAt?: string;
	/**
	 * @description The alert state and the silences and inhibitions suppressing it.
	 */
	status?: TypesAlertStatusDTO;
}

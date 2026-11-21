/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelDefectDTO } from './alertmanagertypesChannelDefectDTO';
import type { AlertmanagertypesChannelRepairActionDTO } from './alertmanagertypesChannelRepairActionDTO';
import type { AlertmanagertypesListedNotificationChannelDTO } from './alertmanagertypesListedNotificationChannelDTO';

export interface AlertmanagertypesChannelRepairDTO {
	/**
	 * @description The repair that makes the channel readable: none, retype, split or delete.
	 */
	action: AlertmanagertypesChannelRepairActionDTO;
	/**
	 * @type boolean
	 * @description Whether the action was written; false on a dry run.
	 */
	applied: boolean;
	/**
	 * @type array
	 * @description Why the action was not, or would not be, applied.
	 */
	blockers?: string[];
	/**
	 * @type array,null
	 * @description The channels that exist once the action is applied.
	 */
	channels?: AlertmanagertypesListedNotificationChannelDTO[] | null;
	/**
	 * @description Why v2 cannot read the channel; none when it is readable.
	 */
	defect: AlertmanagertypesChannelDefectDTO;
	/**
	 * @type string
	 * @description A human-readable explanation of the defect.
	 */
	detail?: string;
	/**
	 * @type string
	 * @description The UUID of the diagnosed channel.
	 */
	id: string;
}

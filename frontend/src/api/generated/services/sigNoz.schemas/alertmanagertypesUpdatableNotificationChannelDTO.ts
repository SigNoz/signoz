/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigDTO } from './alertmanagertypesChannelConfigDTO';

export interface AlertmanagertypesUpdatableNotificationChannelDTO {
	/**
	 * @description The replacement provider kind and spec. Name and displayName are immutable and not part of the body.
	 */
	config: AlertmanagertypesChannelConfigDTO;
}

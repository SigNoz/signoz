/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesListedNotificationChannelDTO } from './alertmanagertypesListedNotificationChannelDTO';

export interface AlertmanagertypesListableNotificationChannelDTO {
	/**
	 * @type array
	 * @description The channels on this page, without their configuration; fetch a channel by ID for that.
	 */
	channels: AlertmanagertypesListedNotificationChannelDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of channels the filter matches across all pages.
	 */
	total: number;
}

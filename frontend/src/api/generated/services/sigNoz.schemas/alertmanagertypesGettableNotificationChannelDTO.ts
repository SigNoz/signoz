/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigDTO } from './alertmanagertypesChannelConfigDTO';

export interface AlertmanagertypesGettableNotificationChannelDTO {
	/**
	 * @description The provider kind and spec, credentials included.
	 */
	config: AlertmanagertypesChannelConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 * @description When the channel was created, as an RFC 3339 timestamp.
	 */
	createdAt: string;
	/**
	 * @type string
	 * @description The label shown in the UI. Alert rules and routing policies reference it, not name.
	 */
	displayName: string;
	/**
	 * @type string
	 * @description The channel UUID.
	 */
	id: string;
	/**
	 * @type string
	 * @description The immutable DNS-1123 identifier of the channel. Alert rules and routing policies reference displayName, not name.
	 */
	name: string;
	/**
	 * @type string
	 * @format date-time
	 * @description When the channel was last updated, as an RFC 3339 timestamp.
	 */
	updatedAt: string;
}

/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelConfigDTO } from './alertmanagertypesChannelConfigDTO';

export interface AlertmanagertypesPostableNotificationChannelDTO {
	/**
	 * @description The provider kind and its spec.
	 */
	config: AlertmanagertypesChannelConfigDTO;
	/**
	 * @type string
	 * @description The label shown in the UI. Alert rules and routing policies reference it, not name. Defaults to name; required when generateName is true.
	 */
	displayName?: string;
	/**
	 * @type boolean
	 * @description Derive name from displayName plus a random suffix instead of supplying it. Defaults to false.
	 */
	generateName?: boolean;
	/**
	 * @type string
	 * @description The immutable DNS-1123 identifier of the channel (lowercase letters, digits and hyphens, at most 63 characters). Required unless generateName is true, in which case it must be empty. Alert rules and routing policies reference displayName, not name.
	 */
	name?: string;
}

/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelSlackConfirmationDTO } from './alertmanagertypesChannelSlackConfirmationDTO';

export interface AlertmanagertypesChannelSlackActionDTO {
	/**
	 * @description A confirmation dialog shown before the action runs.
	 */
	confirm?: AlertmanagertypesChannelSlackConfirmationDTO;
	/**
	 * @type string
	 * @description The action name Slack posts back for a message button; required unless url is set.
	 */
	name?: string;
	/**
	 * @type string
	 * @description The button style: default, primary or danger.
	 */
	style?: string;
	/**
	 * @type string
	 * @description The button label.
	 */
	text: string;
	/**
	 * @type string
	 * @description The Slack action type, normally button.
	 */
	type: string;
	/**
	 * @type string
	 * @description The link the button opens; required unless name is set.
	 */
	url?: string;
	/**
	 * @type string
	 * @description The value Slack posts back with a message button.
	 */
	value?: string;
}

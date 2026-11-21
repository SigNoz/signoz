/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelSlackFieldDTO {
	/**
	 * @type boolean,null
	 * @description Render the field side by side with other short fields.
	 */
	short?: boolean | null;
	/**
	 * @type string
	 * @description The field title.
	 */
	title: string;
	/**
	 * @type string
	 * @description The field value; an Alertmanager template.
	 */
	value: string;
}

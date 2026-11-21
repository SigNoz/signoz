/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesRepeatOnDTO } from './alertmanagertypesRepeatOnDTO';
import type { AlertmanagertypesRepeatTypeDTO } from './alertmanagertypesRepeatTypeDTO';

export interface AlertmanagertypesRecurrenceDTO {
	/**
	 * @type string
	 */
	duration: string;
	/**
	 * @type array,null
	 */
	repeatOn?: AlertmanagertypesRepeatOnDTO[] | null;
	repeatType: AlertmanagertypesRepeatTypeDTO;
}

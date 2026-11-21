import type { AlertmanagertypesDeprecatedGettableAlertDTO } from 'api/generated/services/sigNoz.schemas/alertmanagertypesDeprecatedGettableAlertDTO';

export type Alert = AlertmanagertypesDeprecatedGettableAlertDTO;

export interface GroupedAlert {
	groupKey: string;
	groupLabels: Record<string, string>;
	alerts: Alert[];
	firstAlert: Alert;
}

import type { AlertmanagertypesDeprecatedGettableAlertDTO } from 'api/generated/services/sigNoz.schemas';
import type { AlertStatsBase } from 'components/Alerts';

export type Alert = AlertmanagertypesDeprecatedGettableAlertDTO;

export interface GroupedAlert {
	groupKey: string;
	groupLabels: Record<string, string>;
	alerts: Alert[];
	firstAlert: Alert;
}

export interface AlertStats extends AlertStatsBase {
	byStatus: Record<string, number>;
}

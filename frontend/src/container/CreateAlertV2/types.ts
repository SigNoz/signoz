import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export interface CreateAlertV2Props {
	initialQuery?: Query;
	ruleId?: string;
	alertType: AlertTypes;
}

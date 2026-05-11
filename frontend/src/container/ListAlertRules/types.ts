import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';
import type { AlertStatsBase } from 'components/Alerts';

export type AlertRule = RuletypesRuleDTO;

export interface AlertRuleStats extends AlertStatsBase {
	byState: Record<string, number>;
}

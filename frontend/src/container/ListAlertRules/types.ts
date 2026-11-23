import type { RuletypesListableRuleDTO } from 'api/generated/services/sigNoz.schemas/ruletypesListableRuleDTO';
import type { RuletypesListOrderDTO } from 'api/generated/services/sigNoz.schemas/ruletypesListOrderDTO';
import type { RuletypesListSortDTO } from 'api/generated/services/sigNoz.schemas/ruletypesListSortDTO';
import type { SavedListView } from 'components/ListViews/types';

export type AlertRule = RuletypesListableRuleDTO;

// The v3 list filter a saved view snapshots; pagination is deliberately excluded.
export interface RuleListFilter {
	query: string;
	states: string[];
	sort: RuletypesListSortDTO;
	order: RuletypesListOrderDTO;
}

export type RuleView = SavedListView<RuleListFilter>;

export interface RuleViewCtx {
	userEmail: string;
}

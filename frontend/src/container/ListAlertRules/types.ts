import type {
	RuletypesListableRuleDTO,
	RuletypesListOrderDTO,
	RuletypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
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

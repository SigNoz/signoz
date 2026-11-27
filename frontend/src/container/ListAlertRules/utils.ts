import logEvent from 'api/common/logEvent';
import {
	RuletypesListOrderDTO,
	RuletypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { EmptyStateCopy } from 'components/ListViews/types';
import type { SortState } from 'components/TanStackTableView/types';
import { dataSourceForAlertType } from 'constants/alerts';
import {
	buildRuleDeletePermission,
	buildRuleReadPermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import type { AlertRule, RuleAction, RuleListFilter } from './types';

export const ALERT_RULES_REFRESH_INTERVAL = 30_000;

export const ALERT_ACTIONS = {
	TOGGLE: 'toggle',
	EDIT: 'edit',
	CLONE: 'clone',
	DELETE: 'delete',
} as const satisfies Record<string, RuleAction>;

/** What each row action needs. Edit and clone open or copy the stored rule, so they also need `read`. */
export const getRuleActionChecks = (
	ruleId: string,
): Record<RuleAction, BrandedPermission[]> => {
	const read = buildRuleReadPermission(ruleId);
	const update = buildRuleUpdatePermission(ruleId);
	return {
		toggle: [update],
		edit: [read, update],
		clone: [read, RuleCreatePermission],
		delete: [buildRuleDeletePermission(ruleId)],
	};
};

const ACTION_LABELS: Record<string, string> = {
	[ALERT_ACTIONS.TOGGLE]: 'Enable/Disable',
	[ALERT_ACTIONS.EDIT]: 'Edit',
	[ALERT_ACTIONS.CLONE]: 'Clone',
	[ALERT_ACTIONS.DELETE]: 'Delete',
};

export const alertActionLogEvent = (
	action: string,
	record: AlertRule,
): void => {
	const actionValue = ACTION_LABELS[action] ?? action;
	void logEvent('Alert: Action', {
		ruleId: record.id,
		dataSource: dataSourceForAlertType(record.alertType),
		name: record.alert,
		action: actionValue,
	});
};

const COLUMN_TO_SORT: Record<string, RuletypesListSortDTO> = {
	state: RuletypesListSortDTO.state,
	name: RuletypesListSortDTO.name,
	thresholds: RuletypesListSortDTO.thresholds,
	createdAt: RuletypesListSortDTO.created_at,
	updatedAt: RuletypesListSortDTO.updated_at,
};

// Status, highest rank first: firing, nodata, pending, recovering, inactive, disabled.
export const DEFAULT_RULE_LIST_SORT = RuletypesListSortDTO.state;
export const DEFAULT_RULE_LIST_ORDER = RuletypesListOrderDTO.desc;

// `rule_list_filter_invalid`: DSL syntax / key / operator; `rule_list_invalid`: other list params.
export const RULE_LIST_INVALID_ERROR_CODES: readonly string[] = [
	'rule_list_filter_invalid',
	'rule_list_invalid',
];

export function toListSort(
	orderBy: SortState | null,
): Pick<RuleListFilter, 'sort' | 'order'> {
	const sort = orderBy ? COLUMN_TO_SORT[orderBy.columnName] : undefined;
	if (!orderBy || !sort) {
		return { sort: DEFAULT_RULE_LIST_SORT, order: DEFAULT_RULE_LIST_ORDER };
	}
	return {
		sort,
		order:
			orderBy.order === 'asc'
				? RuletypesListOrderDTO.asc
				: RuletypesListOrderDTO.desc,
	};
}

// The backend default sort maps to `null` so the table shows no sort indicator.
export function toOrderBy(
	sort: RuletypesListSortDTO,
	order: RuletypesListOrderDTO,
): SortState | null {
	if (sort === DEFAULT_RULE_LIST_SORT && order === DEFAULT_RULE_LIST_ORDER) {
		return null;
	}
	const columnName = Object.keys(COLUMN_TO_SORT).find(
		(key) => COLUMN_TO_SORT[key] === sort,
	);
	return columnName
		? { columnName, order: order === RuletypesListOrderDTO.asc ? 'asc' : 'desc' }
		: null;
}

export function isSameStates(a: string[], b: string[]): boolean {
	return (
		a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',')
	);
}

export function isSameRuleListFilter(
	a: RuleListFilter,
	b: RuleListFilter,
): boolean {
	return (
		a.query.trim() === b.query.trim() &&
		a.sort === b.sort &&
		a.order === b.order &&
		isSameStates(a.states, b.states)
	);
}

export const DEFAULT_RULE_LIST_FILTER: RuleListFilter = {
	query: '',
	states: [],
	sort: DEFAULT_RULE_LIST_SORT,
	order: DEFAULT_RULE_LIST_ORDER,
};

export function isDefaultRuleListFilter(filter: RuleListFilter): boolean {
	return isSameRuleListFilter(filter, DEFAULT_RULE_LIST_FILTER);
}

interface RuleListEmptyStateArgs {
	isFetching: boolean;
	isError: boolean;
	queryError: string | null;
	hasActiveFilters: boolean;
	total: number;
	viewEmptyState?: EmptyStateCopy;
	onClear: () => void;
}

interface RuleListEmptyState {
	isEmptyDueToFilters: boolean;
	isEmptyNoRules: boolean;
	noResults: EmptyStateCopy;
	// Unset for an empty view with its own copy (Recently viewed): no search to clear.
	onClear?: () => void;
}

export function ruleListEmptyState({
	isFetching,
	isError,
	queryError,
	hasActiveFilters,
	total,
	viewEmptyState,
	onClear,
}: RuleListEmptyStateArgs): RuleListEmptyState {
	const viewEmptyCopy =
		hasActiveFilters || queryError ? undefined : viewEmptyState;
	const isEmpty = !isFetching && total === 0;
	const noResults: EmptyStateCopy = viewEmptyCopy ?? {
		title: 'No matching alert rules',
		description:
			'No alert rules match your search. Try adjusting your search criteria.',
	};
	return {
		isEmptyDueToFilters:
			isEmpty && (hasActiveFilters || !!queryError || !!viewEmptyCopy),
		isEmptyNoRules:
			isEmpty && !isError && !queryError && !hasActiveFilters && !viewEmptyCopy,
		noResults,
		onClear: viewEmptyCopy ? undefined : onClear,
	};
}

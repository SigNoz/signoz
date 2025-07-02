import {
	OPERATORS,
	QUERY_BUILDER_OPERATORS_BY_TYPES,
} from 'constants/queryBuilder';
import ContextMenu from 'periscope/components/ContextMenu';
import { ReactNode } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export type ContextMenuItem = ReactNode;

function getBaseMeta(
	query: Query,
	filterKey: string,
): BaseAutocompleteData | null {
	const steps = query.builder.queryData;
	for (let i = 0; i < steps.length; i++) {
		const { groupBy } = steps[i];
		for (let j = 0; j < groupBy.length; j++) {
			if (groupBy[j].key === filterKey) {
				return groupBy[j];
			}
		}
	}
	return null;
}

const SUPPORTED_OPERATORS = {
	[OPERATORS['=']]: {
		label: 'Is this',
		icon: '=',
		value: '=',
	},
	[OPERATORS['!=']]: {
		label: 'Is not this',
		icon: '!=',
		value: '!=',
	},
	[OPERATORS['>=']]: {
		label: 'Is greater than or equal to',
		icon: '>=',
		value: '>=',
	},
	[OPERATORS['<=']]: {
		label: 'Is less than or equal to',
		icon: '<=',
		value: '<=',
	},
	[OPERATORS['<']]: {
		label: 'Is less than',
		icon: '<',
		value: '<',
	},
};

export function getContextMenuConfig(
	query: Query,
	clickedData: any,
	panelType: string,
	onColumnClick: (operator: string) => void,
): { header?: string; items?: ContextMenuItem } {
	const filterKey = clickedData?.column?.title;
	const header = `Filter by ${filterKey}`;

	const filterDataType = getBaseMeta(query, filterKey)?.dataType || 'string';

	const operators =
		QUERY_BUILDER_OPERATORS_BY_TYPES[
			filterDataType as keyof typeof QUERY_BUILDER_OPERATORS_BY_TYPES
		];

	const filterOperators = operators.filter(
		(operator) => SUPPORTED_OPERATORS[operator],
	);

	if (
		panelType === 'table' &&
		clickedData?.column &&
		!(clickedData.column as any).queryName
	) {
		return {
			header,
			items: filterOperators.map((operator) => (
				<ContextMenu.Item
					key={operator}
					icon={SUPPORTED_OPERATORS[operator].icon}
					onClick={(): void => onColumnClick(SUPPORTED_OPERATORS[operator].value)}
				>
					{SUPPORTED_OPERATORS[operator].label}
				</ContextMenu.Item>
			)),
		};
	}
	return {};
}

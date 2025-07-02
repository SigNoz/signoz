/* eslint-disable jsx-a11y/click-events-have-key-events */
import {
	OPERATORS,
	QUERY_BUILDER_OPERATORS_BY_TYPES,
} from 'constants/queryBuilder';
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
				<div
					key={operator}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						padding: '8px 16px',
						cursor: 'pointer',
					}}
					onClick={(): void => onColumnClick(SUPPORTED_OPERATORS[operator].value)}
					role="button"
					tabIndex={0}
				>
					<span style={{ color: '#3B5AFB', fontSize: 18 }}>
						{SUPPORTED_OPERATORS[operator].icon}
					</span>
					<span style={{ fontWeight: 600, color: '#2B2B43' }}>
						{SUPPORTED_OPERATORS[operator].label}
					</span>
				</div>
			)),
		};
	}
	return {};
}

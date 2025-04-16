/* eslint-disable no-nested-ternary */
import './QueryBuilderSearchV2.styles.scss';

import { Typography } from 'antd';
import {
	ArrowDown,
	ArrowUp,
	ChevronUp,
	Command,
	CornerDownLeft,
	Slash,
} from 'lucide-react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

import ExampleQueriesRendererForLogs from '../QueryBuilderSearch/ExampleQueriesRendererForLogs';
import { convertExampleQueriesToOptions } from '../QueryBuilderSearch/utils';
import { ITag, Option } from './QueryBuilderSearchV2';

interface QueryBuilderSearchDropdownProps {
	menu: React.ReactElement;
	currentState: DropdownState;
	currentFilterItem?: ITag;
	showAllFilters: boolean;
	isMobile?: boolean;
}

function QueryBuilderSearchDropdown({
	menu,
	currentState,
	currentFilterItem,
	showAllFilters,
	isMobile,
}: QueryBuilderSearchDropdownProps): React.ReactElement {
	return (
		<div className="content">
			{currentState === DropdownState.ATTRIBUTE_KEY && (
				<div className="suggested-filters" style={{ fontSize: isMobile ? '12px' : '11px' }}>
					{showAllFilters ? 'All Filters' : 'Suggested Filters'}
				</div>
			)}

			{currentState === DropdownState.OPERATOR && currentFilterItem?.key && (
				<div className="operator-for">
					<span className="operator-for-text" style={{ fontSize: isMobile ? '12px' : '11px' }}>
						Operator for
					</span>
					<span className="operator-for-value" style={{ padding: isMobile ? '4px 12px' : '0px 8px' }}>
						{currentFilterItem.key.key}
					</span>
				</div>
			)}

			{currentState === DropdownState.ATTRIBUTE_VALUE && currentFilterItem?.key && (
				<div className="value-for">
					<span className="value-for-text" style={{ fontSize: isMobile ? '12px' : '11px' }}>
						Value for
					</span>
					<span className="value-for-value" style={{ padding: isMobile ? '4px 12px' : '0px 8px' }}>
						{currentFilterItem.key.key} {currentFilterItem.op}
					</span>
				</div>
			)}

			{menu}

			{!isMobile && (
				<div className="keyboard-shortcuts">
					<div className="navigate">
						<div className="icons">↑↓</div>
						<div className="keyboard-text">to navigate</div>
					</div>
					<div className="update-query">
						<div className="icons">↵</div>
						<div className="keyboard-text">to update query</div>
					</div>
					{showAllFilters && (
						<div className="show-all-filter-items">
							<div className="icons">tab</div>
							<div className="keyboard-text">to show all filter items</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default QueryBuilderSearchDropdown;

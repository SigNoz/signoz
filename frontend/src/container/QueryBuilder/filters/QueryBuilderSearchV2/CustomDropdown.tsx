import { Button, Typography } from 'antd';
import {
	ArrowDown,
	ArrowUp,
	ChevronUp,
	Command,
	CornerDownLeft,
	Filter,
	Slash,
} from 'lucide-react';
import type { BaseSelectRef } from 'rc-select';
import React, { RefObject } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

import ExampleQueriesRendererForLogs from '../QueryBuilderSearch/ExampleQueriesRendererForLogs';
import { convertExampleQueriesToOptions } from '../QueryBuilderSearch/utils';
import { ITag, Option } from './QueryBuilderSearchV2';

interface ICustomDropdownProps {
	menu: React.ReactElement;
	searchValue: string;
	tags: ITag[];
	selectRef: RefObject<BaseSelectRef>;
	options: Option[];
	exampleQueries: TagFilter[];
	onChange: (value: TagFilter) => void;
	setShowAllFilters: (val: boolean) => void;
	currentFilterItem?: ITag;
}

export default function CustomDropdown(
	props: ICustomDropdownProps,
): React.ReactElement {
	const {
		menu,
		setShowAllFilters,
		currentFilterItem,
		searchValue,
		tags,
		exampleQueries,
		selectRef,
		options,
		onChange,
	} = props;
	const userOs = getUserOperatingSystem();
	return (
		<div>
			<div className="content">
				{!currentFilterItem?.key && (
					<div className="suggested-filters">Suggested Filters</div>
				)}
				{menu}
				{!searchValue && tags.length === 0 && (
					<div className="example-queries">
						<div className="heading"> Example Queries </div>
						<div className="query-container">
							{convertExampleQueriesToOptions(exampleQueries).map((query) => (
								<ExampleQueriesRendererForLogs
									key={query.label}
									label={query.label}
									value={query.value}
									handleAddTag={onChange}
								/>
							))}
						</div>
					</div>
				)}
			</div>
			{!currentFilterItem?.key && options.length > 3 && (
				<Button
					type="text"
					className="show-all-filter-props"
					onClick={(): void => {
						setShowAllFilters(true);
						// when clicking on the button the search bar looses the focus
						selectRef?.current?.focus();
					}}
				>
					<div className="filter">
						<section className="left-section">
							<Filter size={14} />
							<Typography.Text className="text">
								Show all filters properties
							</Typography.Text>
						</section>
						<section className="right-section">
							{userOs === UserOperatingSystem.MACOS ? (
								<Command size={14} className="keyboard-shortcut-slash" />
							) : (
								<ChevronUp size={14} className="keyboard-shortcut-slash" />
							)}
							+
							<Slash size={14} className="keyboard-shortcut-slash" />
						</section>
					</div>
				</Button>
			)}

			<div className="keyboard-shortcuts">
				<section className="navigate">
					<ArrowDown size={10} className="icons" />
					<ArrowUp size={10} className="icons" />
					<span className="keyboard-text">to navigate</span>
				</section>
				<section className="update-query">
					<CornerDownLeft size={10} className="icons" />
					<span className="keyboard-text">to update query</span>
				</section>
			</div>
		</div>
	);
}

CustomDropdown.defaultProps = {
	currentFilterItem: undefined,
};

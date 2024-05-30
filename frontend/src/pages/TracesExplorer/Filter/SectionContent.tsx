import './Filter.styles.scss';

import { Button, Card, Checkbox, Input, Tooltip } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ParaGraph } from 'container/Trace/Filters/Panel/PanelBody/Common/styles';
import { defaultTo } from 'lodash-es';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import {
	addFilter,
	AllTraceFilterKeys,
	FilterType,
	removeFilter,
	statusFilterOption,
	useGetAggregateValues,
} from './filterUtils';

interface SectionBodyProps {
	type: AllTraceFilterKeys;
	selectedFilters: FilterType | undefined;
	setSelectedFilters: Dispatch<SetStateAction<FilterType | undefined>>;
}

export function SectionBody(props: SectionBodyProps): JSX.Element {
	const { type, setSelectedFilters, selectedFilters } = props;
	const [visibleItemsCount, setVisibleItemsCount] = useState(10);
	const [searchFilter, setSearchFilter] = useState<string>('');
	const [checkedItems, setCheckedItems] = useState<string[]>(
		defaultTo(selectedFilters?.[type]?.values, []),
	);

	useEffect(
		() => setCheckedItems(defaultTo(selectedFilters?.[type]?.values, [])),
		[selectedFilters, type],
	);

	const { isFetching, keys, results } = useGetAggregateValues({ value: type });

	const handleShowMore = (): void => {
		setVisibleItemsCount((prevCount) => prevCount + 10);
	};

	const onCheckHandler = (event: CheckboxChangeEvent, value: string): void => {
		const { checked } = event.target;
		if (checked) {
			addFilter(type, value, setSelectedFilters, keys);
			setCheckedItems((prev) => {
				if (!prev.includes(value)) {
					prev.push(value);
				}
				return prev;
			});
		} else {
			removeFilter(type, value, setSelectedFilters, keys);
			setCheckedItems((prev) => prev.filter((item) => item !== value));
		}
	};

	return (
		<Card
			bordered={false}
			className="section-card"
			loading={type === 'status' ? false : isFetching}
			key={type}
		>
			<Input.Search
				value={searchFilter}
				onChange={(e): void => setSearchFilter(e.target.value)}
				placeholder="Filter Values"
				className="search-input"
			/>
			{(type === 'status' ? statusFilterOption : results)
				.filter((i) => i.length)
				.filter((filter) => {
					if (searchFilter.length === 0) {
						return true;
					}
					return filter
						.toLocaleLowerCase()
						.includes(searchFilter.toLocaleLowerCase());
				})
				.slice(0, visibleItemsCount)
				.map((item) => (
					<Checkbox
						className="submenu-checkbox"
						key={`${type}-${item}`}
						onChange={(e): void => onCheckHandler(e, item)}
						checked={checkedItems?.includes(item)}
					>
						<Tooltip overlay={<div>{item}</div>} placement="rightTop">
							<ParaGraph ellipsis style={{ maxWidth: 200 }}>
								{item}
							</ParaGraph>
						</Tooltip>
					</Checkbox>
				))}
			{visibleItemsCount < results.length && (
				<Button onClick={handleShowMore} type="link">
					Show More
				</Button>
			)}
		</Card>
	);
}

import './Filter.styles.scss';

import { Button, Card, Checkbox, Input, Tooltip } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ParaGraph } from 'container/Trace/Filters/Panel/PanelBody/Common/styles';
import { useFetchKeysAndValues } from 'hooks/queryBuilder/useFetchKeysAndValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Dispatch, SetStateAction, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { AllTraceFilterKeys, statusFilterOption } from './filterUtils';

interface SectionBodyProps {
	type: AllTraceFilterKeys;
	setSelectedFilters: Dispatch<
		SetStateAction<
			| Record<
					AllTraceFilterKeys,
					{ values: string[]; keys: BaseAutocompleteData }
			  >
			| undefined
		>
	>;
}

type FilterType = Record<
	AllTraceFilterKeys,
	{ values: string[]; keys: BaseAutocompleteData }
>;

export function SectionBody(props: SectionBodyProps): JSX.Element {
	const { type, setSelectedFilters } = props;
	const [visibleItemsCount, setVisibleItemsCount] = useState(10);
	const [searchFilter, setSearchFilter] = useState<string>('');
	const [checkedItems, setCheckedItems] = useState<string[]>([]);

	const { currentQuery } = useQueryBuilder();

	const { results, isFetching, keys } = useFetchKeysAndValues(
		`${type} =`,
		currentQuery?.builder?.queryData[0] || null,
		type,
	);

	const handleShowMore = (): void => {
		setVisibleItemsCount((prevCount) => prevCount + 10);
	};

	const addFilter = (filterType: AllTraceFilterKeys, value: string): void => {
		setSelectedFilters((prevFilters) => {
			// If previous filters are undefined, initialize them
			if (!prevFilters) {
				return ({
					[filterType]: { values: [value], keys: keys?.[0] },
				} as unknown) as FilterType;
			}
			console.log(prevFilters[filterType].values);
			// If the filter type doesn't exist, initialize it
			if (!prevFilters[filterType].values.length) {
				return {
					...prevFilters,
					[filterType]: { values: [value], keys: keys?.[0] },
				};
			}
			// If the value already exists, don't add it again
			if (prevFilters[filterType].values.includes(value)) {
				return prevFilters;
			}
			// Otherwise, add the value to the existing array
			return {
				...prevFilters,
				[filterType]: {
					values: [...prevFilters[filterType].values, value],
					keys: keys?.[0],
				},
			};
		});
	};

	// Function to remove a filter
	const removeFilter = (filterType: AllTraceFilterKeys, value: string): void => {
		setSelectedFilters((prevFilters) => {
			if (!prevFilters || !prevFilters[filterType].values.length) {
				return prevFilters;
			}

			const updatedValues = prevFilters[filterType].values.filter(
				(item) => item !== value,
			);

			if (updatedValues.length === 0) {
				const { [filterType]: item, ...remainingFilters } = prevFilters;
				return Object.keys(remainingFilters).length > 0
					? (remainingFilters as FilterType)
					: undefined;
			}

			return {
				...prevFilters,
				[filterType]: { values: updatedValues, keys: keys?.[0] },
			};
		});
	};

	const onCheckHandler = (event: CheckboxChangeEvent, value: string): void => {
		const { checked } = event.target;
		if (checked) {
			addFilter(type, value);
			setCheckedItems((prev) => {
				if (!prev.includes(value)) {
					prev.push(value);
				}
				return prev;
			});
		} else {
			removeFilter(type, value);
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
						checked={checkedItems.includes(item)}
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

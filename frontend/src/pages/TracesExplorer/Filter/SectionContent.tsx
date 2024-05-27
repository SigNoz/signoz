import { Button, Card, Checkbox, Tooltip } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ParaGraph } from 'container/Trace/Filters/Panel/PanelBody/Common/styles';
import { useFetchKeysAndValues } from 'hooks/queryBuilder/useFetchKeysAndValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Dispatch, SetStateAction, useState } from 'react';
import { TraceFilterEnum } from 'types/reducer/trace';

interface SectionBodyProps {
	type: TraceFilterEnum;
	setSelectedFilters: Dispatch<
		SetStateAction<Record<TraceFilterEnum, string[]> | undefined>
	>;
}

type FilterType = Record<TraceFilterEnum, string[]>;

export function SectionBody(props: SectionBodyProps): JSX.Element {
	const { type, setSelectedFilters } = props;
	const [visibleItemsCount, setVisibleItemsCount] = useState(10);

	const { currentQuery } = useQueryBuilder();
	const { results, isFetching } = useFetchKeysAndValues(
		`${type} =`,
		currentQuery?.builder?.queryData[0] || null,
		type,
	);

	const handleShowMore = (): void => {
		setVisibleItemsCount((prevCount) => prevCount + 10);
	};

	const addFilter = (filterType: TraceFilterEnum, value: string): void => {
		setSelectedFilters((prevFilters) => {
			// If previous filters are undefined, initialize them
			if (!prevFilters) {
				return { [filterType]: [value] } as FilterType;
			}
			// If the filter type doesn't exist, initialize it
			if (!prevFilters[filterType]) {
				return { ...prevFilters, [filterType]: [value] };
			}
			// If the value already exists, don't add it again
			if (prevFilters[filterType].includes(value)) {
				return prevFilters;
			}
			// Otherwise, add the value to the existing array
			return {
				...prevFilters,
				[filterType]: [...prevFilters[filterType], value],
			};
		});
	};

	// Function to remove a filter
	const removeFilter = (filterType: TraceFilterEnum, value: string): void => {
		setSelectedFilters((prevFilters) => {
			if (!prevFilters || !prevFilters[filterType]) {
				return prevFilters;
			}

			const updatedValues = prevFilters[filterType].filter(
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
				[filterType]: updatedValues,
			};
		});
	};

	const onCheckHandler = (event: CheckboxChangeEvent, value: string): void => {
		const { checked } = event.target;
		if (checked) {
			addFilter(type, value);
		} else {
			removeFilter(type, value);
		}
	};

	return (
		<Card bordered={false} className="section-card" loading={isFetching}>
			{results
				.slice(0, visibleItemsCount)
				.filter((i) => i.length)
				.map((item) => (
					<Checkbox
						className="submenu-checkbox"
						key={`${type}-${item}`}
						onChange={(e): void => onCheckHandler(e, item)}
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

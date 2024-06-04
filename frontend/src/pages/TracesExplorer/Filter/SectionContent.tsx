import './Filter.styles.scss';

import { Button, Card, Checkbox, Input, Tooltip } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { ParaGraph } from 'container/Trace/Filters/Panel/PanelBody/Common/styles';
import useDebounce from 'hooks/useDebounce';
import { defaultTo, isEmpty } from 'lodash-es';
import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useEffect,
	useMemo,
	useState,
} from 'react';

import {
	addFilter,
	AllTraceFilterKeys,
	FilterType,
	HandleRunProps,
	removeFilter,
	statusFilterOption,
	useGetAggregateValues,
} from './filterUtils';

interface SectionBodyProps {
	type: AllTraceFilterKeys;
	selectedFilters: FilterType | undefined;
	setSelectedFilters: Dispatch<SetStateAction<FilterType | undefined>>;
	handleRun: (props?: HandleRunProps) => void;
}

export function SectionBody(props: SectionBodyProps): JSX.Element {
	const { type, setSelectedFilters, selectedFilters, handleRun } = props;
	const [visibleItemsCount, setVisibleItemsCount] = useState(10);
	const [searchFilter, setSearchFilter] = useState<string>('');
	const [checkedItems, setCheckedItems] = useState<string[]>(
		defaultTo(selectedFilters?.[type]?.values as string[], []),
	);

	const [results, setResults] = useState<string[]>([]);
	const [isFetching, setFetching] = useState<boolean>(false);

	useEffect(
		() =>
			setCheckedItems(defaultTo(selectedFilters?.[type]?.values as string[], [])),
		[selectedFilters, type],
	);
	const debouncedSearchText = useDebounce(searchFilter, DEBOUNCE_DELAY);

	const { isFetching: fetching, keys, results: res } = useGetAggregateValues({
		value: type,
		searchText: debouncedSearchText,
	});

	useEffect(() => {
		setResults(res);
		setFetching(fetching);
	}, [fetching, res]);

	const handleShowMore = (): void => {
		setVisibleItemsCount((prevCount) => prevCount + 10);
	};

	const listData = useMemo(
		() =>
			(type === 'hasError' ? statusFilterOption : results)
				.filter((i) => i.length)
				.filter((filter) => {
					if (searchFilter.length === 0) {
						return true;
					}
					return filter
						.toLocaleLowerCase()
						.includes(searchFilter.toLocaleLowerCase());
				})
				.slice(0, visibleItemsCount),
		[results, searchFilter, type, visibleItemsCount],
	);

	const onCheckHandler = (event: CheckboxChangeEvent, value: string): void => {
		const { checked } = event.target;
		let newValue = value;
		if (type === 'hasError') {
			newValue = String(value === 'Error');
		}
		if (checked) {
			addFilter(type, newValue, setSelectedFilters, keys);
			setCheckedItems((prev) => {
				if (!prev.includes(newValue)) {
					prev.push(newValue);
				}
				return prev;
			});
		} else if (checkedItems.length === 1) {
			handleRun({ clearByType: type });
			setCheckedItems([]);
		} else {
			removeFilter(type, newValue, setSelectedFilters, keys);
			setCheckedItems((prev) => prev.filter((item) => item !== newValue));
		}
	};

	const checkboxMatcher = (item: string): boolean =>
		checkedItems?.includes(type === 'hasError' ? String(item === 'Error') : item);

	const labelClassname = (item: string): string => `${type}-${item}`;

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		const inputValue = e.target.value;
		setSearchFilter(inputValue);
	};

	return (
		<Card
			bordered={false}
			className="section-card"
			loading={type === 'hasError' ? false : isFetching}
			key={type}
		>
			<>
				<Input.Search
					value={searchFilter}
					onChange={handleSearch}
					placeholder="Filter Values"
					className="search-input"
				/>
				{listData.length === 0 && isEmpty(searchFilter) ? (
					<div style={{ padding: '8px 18px' }}>No data found</div>
				) : (
					<>
						{listData.map((item) => (
							<Checkbox
								className="submenu-checkbox"
								key={`${type}-${item}`}
								onChange={(e): void => onCheckHandler(e, item)}
								checked={checkboxMatcher(item)}
							>
								<div className="checkbox-label">
									<div className={labelClassname(item)} />
									<Tooltip overlay={<div>{item}</div>} placement="rightTop">
										<ParaGraph ellipsis style={{ maxWidth: 200 }}>
											{item}
										</ParaGraph>
									</Tooltip>
								</div>
							</Checkbox>
						))}
						{visibleItemsCount < results.length && (
							<Button onClick={handleShowMore} type="link">
								Show More
							</Button>
						)}
					</>
				)}
			</>
		</Card>
	);
}

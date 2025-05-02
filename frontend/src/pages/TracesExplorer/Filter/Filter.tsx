/* eslint-disable react-hooks/exhaustive-deps */
import './Filter.styles.scss';

import {
	FilterOutlined,
	SyncOutlined,
	VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { Button, Flex, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { cloneDeep, isArray, isEmpty, isEqual } from 'lodash-es';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import {
	AllTraceFilterKeys,
	AllTraceFilterKeyValue,
	AllTraceFilterOptions,
	FilterType,
	HandleRunProps,
	unionTagFilterItems,
} from './filterUtils';
import { Section } from './Section';

interface FilterProps {
	setOpen: Dispatch<SetStateAction<boolean>>;
}

export function Filter(props: FilterProps): JSX.Element {
	const { setOpen } = props;
	const [selectedFilters, setSelectedFilters] = useState<
		Record<
			AllTraceFilterKeys,
			{ values: string[] | string; keys: BaseAutocompleteData }
		>
	>();

	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const compositeQuery = useGetCompositeQueryParam();

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const syncSelectedFilters = useMemo((): FilterType => {
		const filters = compositeQuery?.builder.queryData?.[0].filters;
		if (!filters) {
			return {} as FilterType;
		}

		return (filters.items || [])
			.filter((item) =>
				Object.keys(AllTraceFilterKeyValue).includes(item.key?.key as string),
			)
			.filter(
				(item) =>
					(item.op === 'in' && item.key?.key !== 'durationNano') ||
					(item.key?.key === 'durationNano' && ['>=', '<='].includes(item.op)),
			)
			.reduce((acc, item) => {
				const keys = item.key as BaseAutocompleteData;
				const attributeName = item.key?.key || '';
				const values = item.value as string[];

				if ((attributeName as AllTraceFilterKeys) === 'durationNano') {
					if (item.op === '>=') {
						acc.durationNanoMin = {
							values: getMs(String(values)),
							keys,
						};
					} else {
						acc.durationNanoMax = {
							values: getMs(String(values)),
							keys,
						};
					}
					return acc;
				}

				if (attributeName) {
					if (acc[attributeName as AllTraceFilterKeys]) {
						const existingValue = acc[attributeName as AllTraceFilterKeys];
						acc[attributeName as AllTraceFilterKeys] = {
							values: [...existingValue.values, ...values],
							keys,
						};
					} else {
						acc[attributeName as AllTraceFilterKeys] = { values, keys };
					}
				}

				return acc;
			}, {} as FilterType);
	}, [compositeQuery]);

	useEffect(() => {
		if (!isEqual(syncSelectedFilters, selectedFilters)) {
			setSelectedFilters(syncSelectedFilters);
		}
	}, [syncSelectedFilters]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const preparePostData = (): TagFilterItem[] => {
		if (!selectedFilters) {
			return [];
		}

		const items = Object.keys(selectedFilters)?.flatMap((attribute) => {
			const { keys, values } = selectedFilters[attribute as AllTraceFilterKeys];
			if (
				['durationNanoMax', 'durationNanoMin', 'durationNano'].includes(
					attribute as AllTraceFilterKeys,
				)
			) {
				if (!values || !values.length) {
					return [];
				}
				let minValue = '';
				let maxValue = '';

				const durationItems: TagFilterItem[] = [];

				if (isArray(values)) {
					minValue = values?.[0];
					maxValue = values?.[1];

					const minItems: TagFilterItem = {
						id: uuid().slice(0, 8),
						op: '>=',
						key: keys,
						value: Number(minValue) * 1000000,
					};

					const maxItems: TagFilterItem = {
						id: uuid().slice(0, 8),
						op: '<=',
						key: keys,
						value: Number(maxValue) * 1000000,
					};
					return maxValue ? [minItems, maxItems] : [minItems];
				}
				if (attribute === 'durationNanoMin') {
					durationItems.push({
						id: uuid().slice(0, 8),
						op: '>=',
						key: keys,
						value: Number(values) * 1000000,
					});
				} else {
					durationItems.push({
						id: uuid().slice(0, 8),
						op: '<=',
						key: keys,
						value: Number(values) * 1000000,
					});
				}

				return durationItems;
			}
			return {
				id: uuid().slice(0, 8),
				key: keys,
				op: 'in',
				value: values,
			};
		});

		return items as TagFilterItem[];
	};

	const removeFilterItemIds = (query: Query): Query => {
		const clonedQuery = cloneDeep(query);
		clonedQuery.builder.queryData = clonedQuery.builder.queryData.map((data) => ({
			...data,
			filters: {
				...data.filters,
				items: data.filters?.items?.map((item) => ({
					...item,
					id: '',
				})),
			},
		}));
		return clonedQuery;
	};

	const handleRun = useCallback(
		(props?: HandleRunProps): void => {
			const preparedQuery: Query = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((item) => ({
						...item,
						filters: {
							...item.filters,
							items: props?.resetAll
								? []
								: (unionTagFilterItems(item.filters?.items, preparePostData())
										.map((item) =>
											item.key?.key === props?.clearByType ? undefined : item,
										)
										.filter((i) => i) as TagFilterItem[]),
						},
					})),
				},
			};
			if (!isEmpty(selectedFilters)) {
				logEvent('Traces Explorer: Sidebar filter used', {
					selectedFilters,
				});
			}

			const currentQueryWithoutIds = removeFilterItemIds(currentQuery);
			const preparedQueryWithoutIds = removeFilterItemIds(preparedQuery);

			if (
				isEqual(currentQueryWithoutIds, preparedQueryWithoutIds) &&
				!props?.resetAll
			) {
				return;
			}

			redirectWithQueryBuilderData(preparedQuery);
		},
		[currentQuery, redirectWithQueryBuilderData, selectedFilters],
	);

	useEffect(() => {
		handleRun();
	}, [selectedFilters]);

	return (
		<>
			<Flex justify="space-between" align="center" className="filter-header">
				<Flex gap={8} align="center">
					<div className="filter-title">
						<FilterOutlined />
						<Typography.Text>Filters</Typography.Text>
					</div>
					<Tooltip title="Reset" placement="right">
						<Button
							onClick={(): void => handleRun({ resetAll: true })}
							className="sync-icon"
							data-testid="reset-filters"
						>
							<SyncOutlined />
						</Button>
					</Tooltip>
				</Flex>
				<Tooltip title="Collapse" placement="right">
					<Button
						onClick={(): void => setOpen(false)}
						className="arrow-icon"
						data-testid="toggle-filter-panel"
					>
						<VerticalAlignTopOutlined rotate={270} />
					</Button>
				</Tooltip>
			</Flex>
			<>
				{AllTraceFilterOptions.filter(
					(i) => i !== 'durationNanoMax' && i !== 'durationNanoMin',
				).map((panelName) => (
					<Section
						key={panelName}
						panelName={panelName}
						selectedFilters={selectedFilters}
						setSelectedFilters={setSelectedFilters}
						handleRun={handleRun}
					/>
				))}
			</>
		</>
	);
}

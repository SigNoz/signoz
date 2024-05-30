/* eslint-disable react-hooks/exhaustive-deps */
import './Filter.styles.scss';

import { ArrowLeftOutlined, FilterOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isEqual } from 'lodash-es';
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
	AllTraceFilterOptions,
	FilterType,
} from './filterUtils';
import { Section } from './Section';

interface FilterProps {
	setOpen: Dispatch<SetStateAction<boolean>>;
}

export function Filter(props: FilterProps): JSX.Element {
	const { setOpen } = props;
	const [selectedFilters, setSelectedFilters] = useState<
		Record<AllTraceFilterKeys, { values: string[]; keys: BaseAutocompleteData }>
	>();

	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const syncSelectedFilters = useMemo((): FilterType => {
		const filters = currentQuery.builder.queryData?.[0].filters;

		let durationValue: { min?: string; max?: string } = {};
		let durationKey;
		const filterRet = filters.items.reduce((acc, item) => {
			const keys = item.key as BaseAutocompleteData;
			const attributeName = item.key?.key || '';
			const values = item.value as string[];

			if ((attributeName as AllTraceFilterKeys) === 'durationNano') {
				if (item.op === '>=') {
					durationValue = { ...durationValue, min: item.value as string };
				} else {
					durationValue = { ...durationValue, max: item.value as string };
				}
				durationKey = keys;
				return acc;
			}

			if (attributeName) {
				acc[attributeName as AllTraceFilterKeys] = { values, keys };
			}

			return acc;
		}, {} as FilterType);

		const durationFinValue = [];
		if (durationValue.min) {
			durationFinValue.push(getMs(String(durationValue.min)));
		}

		if (durationValue.max) {
			durationFinValue.push(getMs(String(durationValue.max)));
		}

		return durationKey && durationFinValue.length
			? {
					...filterRet,
					durationNano: {
						keys: durationKey,
						values: durationFinValue,
					},
			  }
			: filterRet;
	}, [currentQuery]);

	useEffect(() => {
		if (!isEqual(syncSelectedFilters, selectedFilters)) {
			setSelectedFilters(syncSelectedFilters);
		}
	}, [syncSelectedFilters]);

	const preparePostData = (): TagFilterItem[] => {
		if (!selectedFilters) {
			return [];
		}
		const items = Object.keys(selectedFilters)?.flatMap((attribute) => {
			const { keys, values } = selectedFilters[attribute as AllTraceFilterKeys];
			if ((attribute as AllTraceFilterKeys) === 'durationNano') {
				if (!values.length) {
					return [];
				}
				const minValue = values[0];
				const maxValue = values[1];

				const minItems: TagFilterItem = {
					id: uuid().slice(0, 8),
					op: '>=',
					key: keys,
					value: parseInt(minValue, 10) * 1000000,
				};

				const maxItems: TagFilterItem = {
					id: uuid().slice(0, 8),
					op: '<=',
					key: keys,
					value: parseInt(maxValue, 10) * 1000000,
				};

				return maxValue ? [minItems, maxItems] : [minItems];
			}
			return {
				id: uuid().slice(0, 8),
				key: keys,
				op: 'IN',
				value: values,
			};
		});

		return items as TagFilterItem[];
	};

	const handleRun = useCallback((): void => {
		const preparedQuery: Query = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item) => ({
					...item,
					filters: {
						...item.filters,
						items: preparePostData(),
					},
				})),
			},
		};
		redirectWithQueryBuilderData(preparedQuery);
	}, [currentQuery, redirectWithQueryBuilderData, selectedFilters]);

	useEffect(() => {
		handleRun();
	}, [selectedFilters]);

	return (
		<>
			<Flex justify="space-between" align="center" className="filter-header">
				<div className="filter-title">
					<FilterOutlined />
					<Typography.Text>Filters</Typography.Text>
				</div>
				<Button onClick={(): void => setOpen(false)} className="arrow-icon">
					<ArrowLeftOutlined />
				</Button>
			</Flex>
			<>
				{AllTraceFilterOptions.map((panelName) => (
					<Section
						key={panelName}
						panelName={panelName}
						selectedFilters={selectedFilters}
						setSelectedFilters={setSelectedFilters}
					/>
				))}
			</>
		</>
	);
}

import './QuickFilters.styles.scss';

import {
	FilterOutlined,
	SyncOutlined,
	VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { cloneDeep } from 'lodash-es';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import Checkbox from './FilterRenderers/Checkbox/Checkbox';
import Slider from './FilterRenderers/Slider/Slider';

export enum FiltersType {
	SLIDER = 'SLIDER',
	CHECKBOX = 'CHECKBOX',
}

export enum MinMax {
	MIN = 'MIN',
	MAX = 'MAX',
}

export interface IQuickFiltersConfig {
	type: FiltersType;
	attributeKey: BaseAutocompleteData;
	customRendererForValue?: (value: string) => JSX.Element;
	defaultOpen: boolean;
}

interface IQuickFiltersProps {
	config: IQuickFiltersConfig[];
	handleFilterVisibilityChange: () => void;
}

export default function QuickFilters(props: IQuickFiltersProps): JSX.Element {
	const { config, handleFilterVisibilityChange } = props;

	const {
		currentQuery,
		lastUsedQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	// handle the URL update here
	// also take care of only and all values here with IN / NIN / = / != operators on change
	const handleFilterValueChange = (
		attributeKey: BaseAutocompleteData,
		value: string,
		type: FiltersType,
		selected: boolean,
		isOnlyClicked?: boolean,
		minMax?: MinMax,
	): void => {
		console.log(attributeKey, value, type, selected, minMax, isOnlyClicked);
	};

	// clear all the filters for the query which is in sync with filters
	const handleReset = (): void => {
		const updatedQuery = cloneDeep(
			currentQuery?.builder.queryData?.[lastUsedQuery || 0],
		);

		if (!updatedQuery) {
			return;
		}

		if (updatedQuery?.filters?.items) {
			updatedQuery.filters.items = [];
		}

		const preparedQuery: Query = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item, idx) => ({
					...item,
					filters: {
						...item.filters,
						items: idx === lastUsedQuery ? [] : [...item.filters.items],
					},
				})),
			},
		};
		redirectWithQueryBuilderData(preparedQuery);
	};
	return (
		<div className="quick-filters">
			<section className="header">
				<section className="left-actions">
					<FilterOutlined />
					<Typography.Text className="text">Filters</Typography.Text>
					<SyncOutlined className="sync-icon" onClick={handleReset} />
				</section>
				<section className="right-actions">
					<VerticalAlignTopOutlined
						rotate={270}
						onClick={handleFilterVisibilityChange}
					/>
				</section>
			</section>
			<section className="filters">
				{config.map((filter) => {
					switch (filter.type) {
						case FiltersType.CHECKBOX:
							return <Checkbox filter={filter} onChange={handleFilterValueChange} />;
						case FiltersType.SLIDER:
							return <Slider filter={filter} onChange={handleFilterValueChange} />;
						default:
							return <Checkbox filter={filter} onChange={handleFilterValueChange} />;
					}
				})}
			</section>
		</div>
	);
}

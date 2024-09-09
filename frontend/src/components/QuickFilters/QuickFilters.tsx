import './QuickFilters.styles.scss';

import {
	FilterOutlined,
	SyncOutlined,
	VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
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

export enum SpecficFilterOperations {
	ALL = 'ALL',
	ONLY = 'ONLY',
}

export interface IQuickFiltersConfig {
	type: FiltersType;
	title: string;
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

	const lastQueryName =
		currentQuery.builder.queryData?.[lastUsedQuery || 0]?.queryName;
	return (
		<div className="quick-filters">
			<section className="header">
				<section className="left-actions">
					<FilterOutlined />
					<Typography.Text className="text">Filters for</Typography.Text>
					<Tooltip title={`Filter currently in sync with query ${lastQueryName}`}>
						<Typography.Text className="sync-tag">{lastQueryName}</Typography.Text>
					</Tooltip>
				</section>
				<section className="right-actions">
					<Tooltip title="Reset All">
						<SyncOutlined className="sync-icon" onClick={handleReset} />
					</Tooltip>
					<div className="divider-filter" />
					<Tooltip title="Collapse Filters">
						<VerticalAlignTopOutlined
							rotate={270}
							onClick={handleFilterVisibilityChange}
						/>
					</Tooltip>
				</section>
			</section>

			<section className="filters">
				{config.map((filter) => {
					switch (filter.type) {
						case FiltersType.CHECKBOX:
							return <Checkbox filter={filter} />;
						case FiltersType.SLIDER:
							return <Slider filter={filter} />;
						default:
							return <Checkbox filter={filter} />;
					}
				})}
			</section>
		</div>
	);
}

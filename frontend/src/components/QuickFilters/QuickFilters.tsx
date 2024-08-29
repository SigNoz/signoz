import './QuickFilters.styles.scss';

import {
	FilterOutlined,
	SyncOutlined,
	VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

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
	const handleFilterValueChange = (
		attributeKey: BaseAutocompleteData,
		value: string,
		type: FiltersType,
		minMax?: MinMax,
	): void => {
		console.log(attributeKey, value, type, minMax);
	};
	return (
		<div className="quick-filters">
			<section className="header">
				<section className="left-actions">
					<FilterOutlined />
					<Typography.Text className="text">Filters</Typography.Text>
					<SyncOutlined className="sync-icon" />
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

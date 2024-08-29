import './Checkbox.styles.scss';

import { Checkbox, Input, Skeleton, Typography } from 'antd';
import {
	FiltersType,
	IQuickFiltersConfig,
	MinMax,
} from 'components/QuickFilters/QuickFilters';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

interface ICheckboxProps {
	filter: IQuickFiltersConfig;
	onChange: (
		attributeKey: BaseAutocompleteData,
		value: string,
		type: FiltersType,
		selected: boolean,
		minMax?: MinMax,
	) => void;
}

export default function CheckboxFilter(props: ICheckboxProps): JSX.Element {
	const { filter, onChange } = props;
	const [searchText, setSearchText] = useState<string>('');
	const [isOpen, setIsOpen] = useState<boolean>(filter.defaultOpen);
	const [visibleItemsCount, setVisibleItemsCount] = useState<number>(10);

	const { data, isLoading } = useGetAggregateValues(
		{
			aggregateOperator: 'noop',
			dataSource: DataSource.LOGS,
			aggregateAttribute: '',
			attributeKey: filter.attributeKey.key,
			filterAttributeKeyDataType: filter.attributeKey.dataType || DataTypes.EMPTY,
			tagType: filter.attributeKey.type || '',
			searchText: searchText ?? '',
		},
		{
			enabled: isOpen,
			keepPreviousData: true,
		},
	);

	const attributeKeys: string[] = useMemo(
		() =>
			(Object.values(data?.payload || {}).find((el) => !!el) || []) as string[],
		[data?.payload],
	);
	const currentAttributeKeys = attributeKeys.slice(0, visibleItemsCount);

	return (
		<div className="checkbox-filter">
			<section className="filter-header-checkbox">
				<section className="left-action">
					{isOpen ? (
						<ChevronDown
							size={13}
							cursor="pointer"
							onClick={(): void => {
								setIsOpen(false);
								setVisibleItemsCount(10);
							}}
						/>
					) : (
						<ChevronRight
							size={13}
							onClick={(): void => setIsOpen(true)}
							cursor="pointer"
						/>
					)}
					<Typography.Text className="title">
						{filter.attributeKey.key?.split('.')?.join(' ')}
					</Typography.Text>
				</section>
				<section className="right-action">
					{isOpen && (
						<Typography.Text className="clear-all">Clear All</Typography.Text>
					)}
				</section>
			</section>
			{isOpen && isLoading && !attributeKeys.length && (
				<section className="loading">
					<Skeleton paragraph={{ rows: 4 }} />
				</section>
			)}
			{isOpen && !isLoading && (
				<>
					<section className="search">
						<Input
							placeholder="Filter values"
							onChange={(e): void => setSearchText(e.target.value)}
						/>
					</section>
					{attributeKeys.length > 0 ? (
						<section className="values">
							{currentAttributeKeys.map((value: string) => (
								<div key={value} className="value">
									<Checkbox
										onChange={(e): void =>
											onChange(filter.attributeKey, value, filter.type, e.target.checked)
										}
									/>
									{filter.customRendererForValue ? (
										filter.customRendererForValue(value)
									) : (
										<Typography.Text
											className="value-string"
											ellipsis={{ tooltip: { placement: 'right' } }}
										>
											{value}
										</Typography.Text>
									)}
								</div>
							))}
						</section>
					) : (
						<section className="no-data">
							<Typography.Text>No values found</Typography.Text>{' '}
						</section>
					)}
					{visibleItemsCount < attributeKeys?.length && (
						<section className="show-more">
							<Typography.Text
								className="show-more-text"
								onClick={(): void => setVisibleItemsCount((prev) => prev + 10)}
							>
								Show More...
							</Typography.Text>
						</section>
					)}
				</>
			)}
		</div>
	);
}

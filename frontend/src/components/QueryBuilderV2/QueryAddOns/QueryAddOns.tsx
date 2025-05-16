import './QueryAddOns.styles.scss';

import { Button, Radio, RadioChangeEvent } from 'antd';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { GroupByFilter } from 'container/QueryBuilder/filters/GroupByFilter/GroupByFilter';
import { OrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { BarChart2, ScrollText, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import HavingFilter from './HavingFilter/HavingFilter';

interface AddOn {
	icon: React.ReactNode;
	label: string;
	key: string;
}

const ADD_ONS: Record<string, AddOn> = {
	GROUP_BY: {
		icon: <BarChart2 size={14} />,
		label: 'Group By',
		key: 'group_by',
	},
	HAVING: {
		icon: <ScrollText size={14} />,
		label: 'Having',
		key: 'having',
	},
	ORDER_BY: {
		icon: <ScrollText size={14} />,
		label: 'Order By',
		key: 'order_by',
	},
	LIMIT: {
		icon: <ScrollText size={14} />,
		label: 'Limit',
		key: 'limit',
	},
	LEGEND_FORMAT: {
		icon: <ScrollText size={14} />,
		label: 'Legend format',
		key: 'legend_format',
	},
};

function QueryAddOns({
	query,
	version,
	isListViewPanel,
}: {
	query: IBuilderQuery;
	version: string;
	isListViewPanel: boolean;
}): JSX.Element {
	const [selectedViews, setSelectedViews] = useState<AddOn[]>([]);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query,
		entityVersion: '',
	});

	const handleOptionClick = (e: RadioChangeEvent): void => {
		if (selectedViews.find((view) => view.key === e.target.value.key)) {
			setSelectedViews(
				selectedViews.filter((view) => view.key !== e.target.value.key),
			);
		} else {
			setSelectedViews([...selectedViews, e.target.value]);
		}
	};

	const handleChangeGroupByKeys = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			handleChangeQueryData('groupBy', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeOrderByKeys = useCallback(
		(value: IBuilderQuery['orderBy']) => {
			handleChangeQueryData('orderBy', value);
		},
		[handleChangeQueryData],
	);

	const handleRemoveView = useCallback(
		(key: string): void => {
			setSelectedViews(selectedViews.filter((view) => view.key !== key));
		},
		[selectedViews],
	);

	return (
		<div className="query-add-ons">
			{selectedViews.length > 0 && (
				<div className="selected-add-ons-content">
					{selectedViews.find((view) => view.key === 'group_by') && (
						<div className="add-on-content">
							<div className="periscope-input-with-label">
								<div className="label">Group By</div>
								<div className="input">
									<GroupByFilter
										disabled={
											query.dataSource === DataSource.METRICS &&
											!query.aggregateAttribute.key
										}
										query={query}
										onChange={handleChangeGroupByKeys}
									/>
								</div>
								<Button
									className="close-btn periscope-btn ghost"
									icon={<X size={16} />}
									onClick={(): void => handleRemoveView('group_by')}
								/>
							</div>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'having') && (
						<div className="add-on-content">
							<HavingFilter
								onClose={(): void => {
									setSelectedViews(
										selectedViews.filter((view) => view.key !== 'having'),
									);
								}}
							/>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'limit') && (
						<div className="add-on-content">
							<InputWithLabel
								label="Limit"
								placeholder="Select a field"
								onClose={(): void => {
									setSelectedViews(selectedViews.filter((view) => view.key !== 'limit'));
								}}
							/>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'order_by') && (
						<div className="add-on-content">
							<div className="periscope-input-with-label">
								<div className="label">Order By</div>
								<div className="input">
									<OrderByFilter
										entityVersion={version}
										query={query}
										onChange={handleChangeOrderByKeys}
										isListViewPanel={isListViewPanel}
									/>
								</div>
								<Button
									className="close-btn periscope-btn ghost"
									icon={<X size={16} />}
									onClick={(): void => handleRemoveView('order_by')}
								/>
							</div>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'legend_format') && (
						<div className="add-on-content">
							<InputWithLabel
								label="Legend format"
								placeholder="Write legend format"
								onClose={(): void => {
									setSelectedViews(
										selectedViews.filter((view) => view.key !== 'legend_format'),
									);
								}}
							/>
						</div>
					)}
				</div>
			)}

			<div className="add-ons-list">
				<Radio.Group
					className="add-ons-tabs"
					onChange={handleOptionClick}
					value={selectedViews}
				>
					{Object.values(ADD_ONS).map((addOn) => (
						<Radio.Button
							key={addOn.label}
							className={
								selectedViews.find((view) => view.key === addOn.key)
									? 'selected_view tab'
									: 'tab'
							}
							value={addOn}
						>
							<div className="add-on-tab-title">
								{addOn.icon}
								{addOn.label}
							</div>
						</Radio.Button>
					))}
				</Radio.Group>
			</div>
		</div>
	);
}

export default QueryAddOns;

/*

<Radio.Button
className={
	// eslint-disable-next-line sonarjs/no-duplicate-string
	selectedView === ADD_ONS.GROUP_BY ? 'selected_view tab' : 'tab'
}
value={ADD_ONS.GROUP_BY}
>
<div className="add-on-tab-title">
	<BarChart2 size={14} />
	{selectedView.label}
</div>
</Radio.Button>
<Radio.Button
className={selectedView === ADD_ONS.HAVING ? 'selected_view tab' : 'tab'}
value={ADD_ONS.HAVING}
>
<div className="add-on-tab-title">
	<ScrollText size={14} />
	{selectedView.label}
</div>
</Radio.Button>
<Radio.Button
className={
	selectedView === ADD_ONS.ORDER_BY ? 'selected_view tab' : 'tab'
}
value={ADD_ONS.ORDER_BY}
>
<div className="add-on-tab-title">
	<DraftingCompass size={14} />
	{selectedView.label}
</div>
</Radio.Button>
<Radio.Button
className={selectedView === ADD_ONS.LIMIT ? 'selected_view tab' : 'tab'}
value={ADD_ONS.LIMIT}
>
<div className="add-on-tab-title">
	<Package2 size={14} />
	{selectedView.label}
</div>
</Radio.Button>
<Radio.Button
className={
	selectedView === ADD_ONS.LEGEND_FORMAT ? 'selected_view tab' : 'tab'
}
value={ADD_ONS.LEGEND_FORMAT}
>
<div className="add-on-tab-title">
	<ChevronsLeftRight size={14} />
	{selectedView.label}
</div>
</Radio.Button>

*/

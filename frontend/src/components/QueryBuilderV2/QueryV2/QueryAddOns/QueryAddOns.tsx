import './QueryAddOns.styles.scss';

import { Button, Radio, RadioChangeEvent } from 'antd';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GroupByFilter } from 'container/QueryBuilder/filters/GroupByFilter/GroupByFilter';
import { OrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter';
import { ReduceToFilter } from 'container/QueryBuilder/filters/ReduceToFilter/ReduceToFilter';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { BarChart2, ScrollText, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { HandleChangeQueryDataV5 } from 'types/common/operations.types';
import { DataSource } from 'types/common/queryBuilder';

import HavingFilter from './HavingFilter/HavingFilter';

interface AddOn {
	icon: React.ReactNode;
	label: string;
	key: string;
}

const ADD_ONS_KEYS = {
	GROUP_BY: 'group_by',
	HAVING: 'having',
	ORDER_BY: 'order_by',
	LIMIT: 'limit',
	LEGEND_FORMAT: 'legend_format',
};

const ADD_ONS = [
	{
		icon: <BarChart2 size={14} />,
		label: 'Group By',
		key: 'group_by',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Having',
		key: 'having',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Order By',
		key: 'order_by',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Limit',
		key: 'limit',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Legend format',
		key: 'legend_format',
	},
];

const REDUCE_TO = {
	icon: <ScrollText size={14} />,
	label: 'Reduce to',
	key: 'reduce_to',
};

function QueryAddOns({
	query,
	version,
	isListViewPanel,
	showReduceTo,
	panelType,
	index,
}: {
	query: IBuilderQuery;
	version: string;
	isListViewPanel: boolean;
	showReduceTo: boolean;
	panelType: PANEL_TYPES | null;
	index: number;
}): JSX.Element {
	const [addOns, setAddOns] = useState<AddOn[]>(ADD_ONS);

	const [selectedViews, setSelectedViews] = useState<AddOn[]>([]);

	const { handleChangeQueryData } = useQueryOperations({
		index,
		query,
		entityVersion: '',
	});

	useEffect(() => {
		if (isListViewPanel) {
			setAddOns([]);

			setSelectedViews([
				ADD_ONS.find((addOn) => addOn.key === ADD_ONS_KEYS.ORDER_BY) as AddOn,
			]);

			return;
		}

		if (panelType === PANEL_TYPES.VALUE) {
			// Filter out all add-ons except legend format
			setAddOns((prevAddOns) =>
				prevAddOns.filter((addOn) => addOn.key === ADD_ONS_KEYS.LEGEND_FORMAT),
			);
		} else {
			let filteredAddOns = Object.values(ADD_ONS);

			// Filter out group_by for metrics data source
			if (query.dataSource === DataSource.METRICS) {
				filteredAddOns = filteredAddOns.filter(
					(addOn) => addOn.key !== ADD_ONS_KEYS.GROUP_BY,
				);
			}

			setAddOns(filteredAddOns);
		}

		// add reduce to if showReduceTo is true
		if (showReduceTo) {
			setAddOns((prevAddOns) => [...prevAddOns, REDUCE_TO]);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [panelType, isListViewPanel, query.dataSource]);

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

	const handleChangeReduceTo = useCallback(
		(value: IBuilderQuery['reduceTo']) => {
			handleChangeQueryData('reduceTo', value);
		},
		[handleChangeQueryData],
	);

	const handleRemoveView = useCallback(
		(key: string): void => {
			setSelectedViews(selectedViews.filter((view) => view.key !== key));
		},
		[selectedViews],
	);

	const handleChangeQueryLegend = useCallback(
		(value: string) => {
			handleChangeQueryData('legend', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeLimit = useCallback(
		(value: string) => {
			handleChangeQueryData('limit', Number(value) || null);
		},
		[handleChangeQueryData],
	);

	const handleChangeHaving = useCallback(
		(value: string) => {
			(handleChangeQueryData as HandleChangeQueryDataV5)('having', {
				expression: value,
			});
		},
		[handleChangeQueryData],
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
							<div className="periscope-input-with-label">
								<div className="label">Having</div>
								<div className="input">
									<HavingFilter
										onClose={(): void => {
											setSelectedViews(
												selectedViews.filter((view) => view.key !== 'having'),
											);
										}}
										onChange={handleChangeHaving}
									/>
								</div>
							</div>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'limit') && (
						<div className="add-on-content">
							<InputWithLabel
								label="Limit"
								onChange={handleChangeLimit}
								placeholder="Enter limit"
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

					{selectedViews.find((view) => view.key === 'reduce_to') && showReduceTo && (
						<div className="add-on-content">
							<div className="periscope-input-with-label">
								<div className="label">Reduce to</div>
								<div className="input">
									<ReduceToFilter query={query} onChange={handleChangeReduceTo} />
								</div>

								<Button
									className="close-btn periscope-btn ghost"
									icon={<X size={16} />}
									onClick={(): void => handleRemoveView('reduce_to')}
								/>
							</div>
						</div>
					)}

					{selectedViews.find((view) => view.key === 'legend_format') && (
						<div className="add-on-content">
							<InputWithLabel
								label="Legend format"
								placeholder="Write legend format"
								onChange={handleChangeQueryLegend}
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
					{addOns.map((addOn) => (
						<Radio.Button
							key={addOn.label}
							className={
								selectedViews.find((view) => view.key === addOn.key)
									? 'selected-view tab'
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

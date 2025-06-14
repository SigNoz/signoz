import './FunnelStep.styles.scss';

import { Button, Divider, Form, Switch, Tooltip } from 'antd';
import { FilterSelect } from 'components/CeleryOverview/CeleryOverviewConfigOptions/CeleryOverviewConfigOptions';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { HardHat, PencilLine } from 'lucide-react';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useMemo, useState } from 'react';
import { FunnelStepData } from 'types/api/traceFunnels';
import { DataSource } from 'types/common/queryBuilder';

import FunnelStepPopover from './FunnelStepPopover';

interface FunnelStepProps {
	stepData: FunnelStepData;
	index: number;
	stepsCount: number;
}

function FunnelStep({
	stepData,
	index,
	stepsCount,
}: FunnelStepProps): JSX.Element {
	const {
		handleStepChange: onStepChange,
		handleStepRemoval: onStepRemove,
	} = useFunnelContext();
	const [form] = Form.useForm();
	const currentQuery = initialQueriesMap[DataSource.TRACES];
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
	const [isAddDetailsModalOpen, setIsAddDetailsModalOpen] = useState<boolean>(
		false,
	);

	// temporarily hide latency pointer, as it breaks some edge cases (ref: https://signoz-team.slack.com/archives/C089MNX4Y90/p1748600682066499?thread_ts=1748599673.171759&cid=C089MNX4Y90)
	// const latencyPointerItems: MenuProps['items'] = LatencyPointers.map(
	// 	(option) => ({
	// 		key: option.value,
	// 		label: option.key,
	// 		style:
	// 			option.value === stepData.latency_pointer
	// 				? { backgroundColor: 'var(--bg-slate-100)' }
	// 				: {},
	// 	}),
	// );

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						filters: stepData.filters ?? {
							op: 'AND',
							items: [],
						},
					},
				],
			},
		}),
		[stepData.filters, currentQuery],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	return (
		<div className="funnel-step">
			<Form form={form}>
				<div className="funnel-step__header">
					<div className="funnel-step-details">
						<div className="funnel-step-details__title-container">
							{/* TODO(shaheer): uncomment after adding support for dragging the steps */}
							{/* <div className="drag-icon">
								<GripVertical size={14} color="var(--bg-slate-200)" />
							</div> */}
							{stepData.name ? (
								<div className="funnel-step-details__title">{stepData.name}</div>
							) : (
								<div className="funnel-step-details__title">Step {index + 1}</div>
							)}
						</div>
						{!!stepData.description && (
							<div className="funnel-step-details__description">
								{stepData.description}
							</div>
						)}
					</div>
					<div className="funnel-step-actions">
						<Tooltip title="Add details to step">
							<Button
								type="text"
								className="funnel-item__action-btn"
								icon={<PencilLine size={14} />}
								onClick={(): void => setIsAddDetailsModalOpen(true)}
							/>
						</Tooltip>

						<Divider type="vertical" />
						<FunnelStepPopover
							isPopoverOpen={isPopoverOpen}
							setIsPopoverOpen={setIsPopoverOpen}
							onStepRemove={(): void => onStepRemove(index)}
							stepsCount={stepsCount}
							isAddDetailsModalOpen={isAddDetailsModalOpen}
							setIsAddDetailsModalOpen={setIsAddDetailsModalOpen}
							stepData={{
								step_order: stepData.step_order,
								name: stepData.name,
								description: stepData.description,
							}}
						/>
					</div>
				</div>
				<div className="funnel-step__content">
					<div className="filters">
						<div className="filters__service-and-span">
							<div className="service">
								<Form.Item name={['steps', stepData.id, 'service_name']}>
									<FilterSelect
										placeholder="Select Service"
										queryParam={QueryParams.service}
										filterType="serviceName"
										shouldSetQueryParams={false}
										values={stepData.service_name}
										isMultiple={false}
										onChange={(v): void => {
											onStepChange(index, { service_name: (v ?? '') as string });
										}}
									/>
								</Form.Item>
							</div>
							<div className="span">
								<Form.Item name={['steps', stepData.id, 'span_name']}>
									<FilterSelect
										placeholder="Select Span name"
										queryParam={QueryParams.spanName}
										filterType="name"
										shouldSetQueryParams={false}
										values={stepData.span_name}
										isMultiple={false}
										onChange={(v): void =>
											onStepChange(index, { span_name: (v ?? '') as string })
										}
									/>
								</Form.Item>
							</div>
						</div>
						<div className="filters__where-filter">
							<div className="label">Where</div>
							<Form.Item name={['steps', stepData.id, 'filters']}>
								<QueryBuilderSearchV2
									query={query}
									onChange={(query): void => onStepChange(index, { filters: query })}
									hasPopupContainer={false}
									placeholder="Search for filters..."
									suffixIcon={<HardHat size={12} color="var(--bg-vanilla-400)" />}
									rootClassName="traces-funnel-where-filter"
								/>
							</Form.Item>
						</div>
					</div>
				</div>
				<div className="funnel-step__footer">
					<div className="error">
						<Switch
							className="error__switch"
							size="small"
							checked={stepData.has_errors}
							onChange={(): void =>
								onStepChange(index, { has_errors: !stepData.has_errors })
							}
						/>
						<div className="error__label">Errors</div>
					</div>
					{/* temporarily hide latency pointer, as it breaks some edge cases (ref: https://signoz-team.slack.com/archives/C089MNX4Y90/p1748600682066499?thread_ts=1748599673.171759&cid=C089MNX4Y90) */}
					{/* <div className="latency-pointer">
						<div className="latency-pointer__label">Latency pointer</div>
						<Dropdown
							menu={{
								items: latencyPointerItems,
								onClick: ({ key }): void =>
									onStepChange(index, {
										latency_pointer: key as FunnelStepData['latency_pointer'],
									}),
							}}
							trigger={['click']}
						>
							<Space>
								{
									LatencyPointers.find(
										(option) => option.value === stepData.latency_pointer,
									)?.key
								}
								<ChevronDown size={14} color="var(--bg-vanilla-400)" />
							</Space>
						</Dropdown>
					</div> */}
				</div>
			</Form>
		</div>
	);
}

export default FunnelStep;

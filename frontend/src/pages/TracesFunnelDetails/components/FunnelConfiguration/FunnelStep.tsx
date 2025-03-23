import './FunnelStep.styles.scss';

import { Dropdown, Space, Switch } from 'antd';
import { MenuProps } from 'antd/lib';
import { FilterSelect } from 'components/CeleryOverview/CeleryOverviewConfigOptions/CeleryOverviewConfigOptions';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { ChevronDown, GripVertical, HardHat } from 'lucide-react';
import { LatencyPointers } from 'pages/TracesFunnelDetails/constants';
import { useState } from 'react';
import { FunnelStepData } from 'types/api/traceFunnels';
import { DataSource } from 'types/common/queryBuilder';

import FunnelStepPopover from './FunnelStepPopover';

interface FunnelStepProps {
	funnelId: string;
	step: FunnelStepData;
}

function FunnelStep({ funnelId, step }: FunnelStepProps): JSX.Element {
	const currentQuery = initialQueriesMap[DataSource.TRACES];
	const query = currentQuery?.builder?.queryData[0] || null;

	const [isErrorsEnabled, setIsErrorsEnabled] = useState(false);
	const [selectedLatencyPointer, setSelectedLatencyPointer] = useState(
		LatencyPointers[0].value,
	);

	const latencyPointerItems: MenuProps['items'] = LatencyPointers.map(
		(option) => ({
			key: option.value,
			label: option.key,
			style:
				option.value === selectedLatencyPointer
					? { backgroundColor: 'var(--bg-slate-100)' }
					: {},
		}),
	);

	const handleSwitchChange = (): void => {
		setIsErrorsEnabled(!isErrorsEnabled);
	};

	const handleSelectedLatencyPointer = (option: string): void => {
		setSelectedLatencyPointer(option);
	};

	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	return (
		<div className="funnel-step">
			{!!step.title || step.description ? (
				<div className="funnel-step__header">
					<div className="funnel-step-details">
						<div className="funnel-step-details__title">{step.title}</div>
						<div className="funnel-step-details__description">{step.description}</div>
					</div>
					<div className="funnel-step-actions">
						<FunnelStepPopover
							isPopoverOpen={isPopoverOpen}
							setIsPopoverOpen={setIsPopoverOpen}
							funnelId={funnelId}
							stepId={step.id}
						/>
					</div>
				</div>
			) : (
				<FunnelStepPopover
					isPopoverOpen={isPopoverOpen}
					setIsPopoverOpen={setIsPopoverOpen}
					funnelId={funnelId}
					stepId={step.id}
					className="step-popover"
				/>
			)}
			<div className="funnel-step__content">
				<div className="drag-icon">
					<GripVertical size={14} color="var(--bg-slate-200)" />
				</div>
				<div className="filters">
					<div className="filters__service-and-span">
						<div className="service">
							<FilterSelect
								placeholder="Select Service"
								queryParam={QueryParams.service}
								filterType="serviceName"
							/>
						</div>
						<div className="span">
							<FilterSelect
								placeholder="Select Span name"
								queryParam={QueryParams.spanName}
								filterType="name"
							/>
						</div>
					</div>
					<div className="filters__where-filter">
						<div className="label">Where</div>
						<QueryBuilderSearchV2
							query={query}
							onChange={(query): void => console.log('change', query)}
							hasPopupContainer={false}
							placeholder="Search for filters..."
							suffixIcon={<HardHat size={12} color="var(--bg-vanilla-400)" />}
							rootClassName="traces-funnel-where-filter"
						/>
					</div>
				</div>
			</div>
			<div className="funnel-step__footer">
				<div className="error">
					<div className="error__label">Errors</div>
					<Switch
						className="error__switch"
						size="small"
						checked={isErrorsEnabled}
						onChange={handleSwitchChange}
					/>
				</div>
				<div className="latency-pointer">
					<div className="latency-pointer__label">Latency pointer</div>
					<Dropdown
						menu={{
							items: latencyPointerItems,
							onClick: ({ key }): void => handleSelectedLatencyPointer(key),
						}}
						trigger={['click']}
					>
						<Space>
							{
								LatencyPointers.find(
									(option) => option.value === selectedLatencyPointer,
								)?.key
							}
							<ChevronDown size={14} color="var(--bg-vanilla-400)" />
						</Space>
					</Dropdown>
				</div>
			</div>
		</div>
	);
}

export default FunnelStep;

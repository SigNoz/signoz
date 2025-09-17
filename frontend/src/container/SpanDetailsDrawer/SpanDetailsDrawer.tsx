import './SpanDetailsDrawer.styles.scss';

import { Button, Tabs, TabsProps, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import LogsIcon from 'assets/AlertHistory/LogsIcon';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { Anvil, Bookmark, Link2, PanelRight, Search } from 'lucide-react';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { formatEpochTimestamp } from 'utils/timeUtils';

import Attributes from './Attributes/Attributes';
import { RelatedSignalsViews } from './constants';
import Events from './Events/Events';
import LinkedSpans from './LinkedSpans/LinkedSpans';
import SpanRelatedSignals from './SpanRelatedSignals/SpanRelatedSignals';

interface ISpanDetailsDrawerProps {
	isSpanDetailsDocked: boolean;
	setIsSpanDetailsDocked: Dispatch<SetStateAction<boolean>>;
	selectedSpan: Span | undefined;
	traceStartTime: number;
	traceEndTime: number;
}

function SpanDetailsDrawer(props: ISpanDetailsDrawerProps): JSX.Element {
	const {
		isSpanDetailsDocked,
		setIsSpanDetailsDocked,
		selectedSpan,
		traceStartTime,
		traceEndTime,
	} = props;

	const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
	const [isRelatedSignalsOpen, setIsRelatedSignalsOpen] = useState<boolean>(
		false,
	);
	const [activeDrawerView, setActiveDrawerView] = useState<RelatedSignalsViews>(
		RelatedSignalsViews.LOGS,
	);
	const color = generateColor(
		selectedSpan?.serviceName || '',
		themeColors.traceDetailColors,
	);

	const handleRelatedSignalsChange = useCallback((e: RadioChangeEvent): void => {
		const selectedView = e.target.value as RelatedSignalsViews;
		setActiveDrawerView(selectedView);
		setIsRelatedSignalsOpen(true);
	}, []);

	const handleRelatedSignalsClose = useCallback((): void => {
		setIsRelatedSignalsOpen(false);
	}, []);

	function getItems(span: Span, startTime: number): TabsProps['items'] {
		return [
			{
				label: (
					<Button
						type="text"
						icon={<Bookmark size="14" />}
						className="attributes-tab-btn"
					>
						<span className="tab-label">Attributes</span>
						<span className="count-badge">
							{Object.keys(span.tagMap || {}).length}
						</span>
					</Button>
				),
				key: 'attributes',
				children: <Attributes span={span} isSearchVisible={isSearchVisible} />,
			},
			{
				label: (
					<Button type="text" icon={<Anvil size="14" />} className="events-tab-btn">
						<span className="tab-label">Events</span>
						<span className="count-badge">{span.event?.length || 0}</span>
					</Button>
				),
				key: 'events',
				children: (
					<Events
						span={span}
						startTime={startTime}
						isSearchVisible={isSearchVisible}
					/>
				),
			},
			{
				label: (
					<Button
						type="text"
						icon={<Link2 size="14" />}
						className="linked-spans-tab-btn"
					>
						<span className="tab-label">Links</span>
						<span className="count-badge">
							{
								(
									span.references?.filter((ref: any) => ref.refType !== 'CHILD_OF') || []
								).length
							}
						</span>
					</Button>
				),
				key: 'linked-spans',
				children: <LinkedSpans span={span} />,
			},
		];
	}

	return (
		<>
			<section className="header">
				{!isSpanDetailsDocked && (
					<div className="heading">
						<div className="dot" style={{ background: color }} />
						<Typography.Text className="text">Span Details</Typography.Text>
					</div>
				)}
				<PanelRight
					size={14}
					cursor="pointer"
					onClick={(): void => setIsSpanDetailsDocked((prev) => !prev)}
				/>
			</section>
			{selectedSpan && !isSpanDetailsDocked && (
				<>
					<section className="description">
						<div className="item">
							<Typography.Text className="attribute-key">span name</Typography.Text>
							<Tooltip title={selectedSpan.name}>
								<div className="value-wrapper">
									<Typography.Text className="attribute-value" ellipsis>
										{selectedSpan.name}
									</Typography.Text>
								</div>
							</Tooltip>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">span id</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{selectedSpan.spanId}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">start time</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{formatEpochTimestamp(selectedSpan.timestamp)}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">duration</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{getYAxisFormattedValue(`${selectedSpan.durationNano}`, 'ns')}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">service</Typography.Text>
							<div className="service">
								<div className="dot" style={{ backgroundColor: color }} />
								<div className="value-wrapper">
									<Tooltip title={selectedSpan.serviceName}>
										<Typography.Text className="service-value" ellipsis>
											{selectedSpan.serviceName}
										</Typography.Text>
									</Tooltip>
								</div>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">span kind</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{selectedSpan.spanKind}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">
								status code string
							</Typography.Text>
							<div className="value-wrapper">
								<Typography.Text className="attribute-value">
									{selectedSpan.statusCodeString}
								</Typography.Text>
							</div>
						</div>

						{selectedSpan.statusMessage && (
							<div className="item">
								<Typography.Text className="attribute-key">
									status message
								</Typography.Text>
								<div className="value-wrapper">
									<Typography.Text className="attribute-value">
										{selectedSpan.statusMessage}
									</Typography.Text>
								</div>
							</div>
						)}
						<div className="item">
							<Typography.Text className="attribute-key">
								related signals
							</Typography.Text>
							<div className="related-signals-section">
								<SignozRadioGroup
									value=""
									options={[
										{
											label: (
												<div className="view-title">
													<LogsIcon width={14} height={14} />
													Logs
												</div>
											),
											value: RelatedSignalsViews.LOGS,
										},
									]}
									onChange={handleRelatedSignalsChange}
									className="related-signals-radio"
								/>
							</div>
						</div>
					</section>

					<section className="attributes-events">
						<Tabs
							items={getItems(selectedSpan, traceStartTime)}
							addIcon
							defaultActiveKey="attributes"
							className="details-drawer-tabs"
							tabBarExtraContent={
								<Search
									size={14}
									className="search-icon"
									cursor="pointer"
									onClick={(): void => setIsSearchVisible((prev) => !prev)}
								/>
							}
						/>
					</section>
				</>
			)}

			{selectedSpan && (
				<SpanRelatedSignals
					selectedSpan={selectedSpan}
					traceStartTime={traceStartTime}
					traceEndTime={traceEndTime}
					isOpen={isRelatedSignalsOpen}
					onClose={handleRelatedSignalsClose}
					initialView={activeDrawerView}
					key={activeDrawerView}
				/>
			)}
		</>
	);
}

export default SpanDetailsDrawer;

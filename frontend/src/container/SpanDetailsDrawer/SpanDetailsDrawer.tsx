import './SpanDetailsDrawer.styles.scss';

import { Button, Tabs, TabsProps, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { themeColors } from 'constants/theme';
import { getTraceToLogsQuery } from 'container/TraceDetail/SelectedSpanDetails/config';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { Anvil, Bookmark, PanelRight, Search } from 'lucide-react';
import { Dispatch, SetStateAction, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { formatEpochTimestamp } from 'utils/timeUtils';

import Attributes from './Attributes/Attributes';
import Events from './Events/Events';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
interface ISpanDetailsDrawerProps {
	isSpanDetailsDocked: boolean;
	setIsSpanDetailsDocked: Dispatch<SetStateAction<boolean>>;
	selectedSpan: Span | undefined;
	traceID: string;
	traceStartTime: number;
	traceEndTime: number;
}

function SpanDetailsDrawer(props: ISpanDetailsDrawerProps): JSX.Element {
	const {
		isSpanDetailsDocked,
		setIsSpanDetailsDocked,
		selectedSpan,
		traceStartTime,
		traceID,
		traceEndTime,
	} = props;

	const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
	const color = generateColor(
		selectedSpan?.serviceName || '',
		themeColors.traceDetailColors,
	);

	function getItems(span: Span, startTime: number): TabsProps['items'] {
		return [
			{
				label: (
					<Button
						type="text"
						icon={<Bookmark size="14" />}
						className="attributes-tab-btn"
					>
						Attributes
					</Button>
				),
				key: 'attributes',
				children: <Attributes span={span} isSearchVisible={isSearchVisible} />,
			},
			{
				label: (
					<Button type="text" icon={<Anvil size="14" />} className="events-tab-btn">
						Events
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
		];
	}
	const onLogsHandler = (): void => {
		const query = getTraceToLogsQuery(traceID, traceStartTime, traceEndTime);

		history.push(
			`${ROUTES.LOGS_EXPLORER}?${createQueryParams({
				[QueryParams.compositeQuery]: JSON.stringify(query),
				// we subtract 5 minutes from the start time to handle the cases when the trace duration is in nanoseconds
				[QueryParams.startTime]: traceStartTime - FIVE_MINUTES_IN_MS,
				// we add 5 minutes to the end time for nano second duration traces
				[QueryParams.endTime]: traceEndTime + FIVE_MINUTES_IN_MS,
			})}`,
		);
	};

	return (
		<div
			className={cx(
				'span-details-drawer',
				isSpanDetailsDocked ? 'span-details-drawer-docked' : '',
			)}
		>
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
					</section>

					<Button onClick={onLogsHandler} className="related-logs">
						Go to related logs
					</Button>

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
		</div>
	);
}

export default SpanDetailsDrawer;

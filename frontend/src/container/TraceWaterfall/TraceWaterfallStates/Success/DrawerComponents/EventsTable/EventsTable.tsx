import './EventsTable.styles.scss';

import { Collapse, Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Diamond } from 'lucide-react';
import { useMemo } from 'react';
import { Event, Span } from 'types/api/trace/getTraceV2';

import NoData from '../NoData/NoData';

interface IEventsTableProps {
	span: Span;
	startTime: number;
}

function EventsTable(props: IEventsTableProps): JSX.Element {
	const { span, startTime } = props;
	const events: Event[] = useMemo(() => {
		const tempEvents = [];
		for (let i = 0; i < span.event?.length; i++) {
			const parsedEvent = JSON.parse(span.event[i]);
			tempEvents.push(parsedEvent);
		}
		return tempEvents;
	}, [span.event]);
	return (
		<div className="events-table">
			{events.length === 0 && (
				<div className="no-events">
					<NoData name="events" />
				</div>
			)}
			<div className="events-container">
				{events.map((event) => (
					<div
						className="event"
						key={`${event.name} ${JSON.stringify(event.attributeMap)}`}
					>
						<Collapse
							size="small"
							defaultActiveKey="1"
							expandIconPosition="right"
							items={[
								{
									key: '1',
									label: (
										<div className="collapse-title">
											<Diamond size={14} className="diamond" />
											<Typography.Text className="collapse-title-name">
												{span.name}
											</Typography.Text>
										</div>
									),
									children: (
										<div className="event-details">
											<div className="attribute-container" key="timeUnixNano">
												<Typography.Text className="attribute-key">
													Start Time
												</Typography.Text>
												<div className="timestamp-container">
													<Typography.Text className="attribute-value">
														{getYAxisFormattedValue(
															`${event.timeUnixNano / 1e6 - startTime}`,
															'ms',
														)}
													</Typography.Text>
													<Typography.Text className="timestamp-text">
														after the start
													</Typography.Text>
												</div>
											</div>
											{event.attributeMap &&
												Object.keys(event.attributeMap).map((attributeKey) => (
													<div className="attribute-container" key={attributeKey}>
														<Typography.Text className="attribute-key">
															{attributeKey}
														</Typography.Text>
														<Typography.Text className="attribute-value">
															{event.attributeMap[attributeKey]}
														</Typography.Text>
													</div>
												))}
										</div>
									),
								},
							]}
						/>
					</div>
				))}
			</div>
		</div>
	);
}

export default EventsTable;

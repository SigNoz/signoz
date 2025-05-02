import './Events.styles.scss';

import { Collapse, Input, Tooltip, Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Diamond } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Event, Span } from 'types/api/trace/getTraceV2';

import NoData from '../NoData/NoData';

interface IEventsTableProps {
	span: Span;
	startTime: number;
	isSearchVisible: boolean;
}

function EventsTable(props: IEventsTableProps): JSX.Element {
	const { span, startTime, isSearchVisible } = props;
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');
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
				{isSearchVisible && (
					<Input
						autoFocus
						placeholder="Search for events..."
						className="search-input"
						value={fieldSearchInput}
						onChange={(e): void => setFieldSearchInput(e.target.value)}
					/>
				)}
				{events
					.filter((eve) =>
						eve.name?.toLowerCase().includes(fieldSearchInput.toLowerCase()),
					)
					.map((event) => (
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
													{event.name}
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
																`${(event.timeUnixNano || 0) / 1e6 - startTime}`,
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
															<Tooltip title={attributeKey}>
																<Typography.Text className="attribute-key" ellipsis>
																	{attributeKey}
																</Typography.Text>
															</Tooltip>

															<div className="wrapper">
																<Tooltip title={event.attributeMap[attributeKey]}>
																	<Typography.Text className="attribute-value" ellipsis>
																		{event.attributeMap[attributeKey]}
																	</Typography.Text>
																</Tooltip>
															</div>
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

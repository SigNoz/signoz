import './Events.styles.scss';

import { Collapse, Input, Modal, Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { Diamond } from 'lucide-react';
import { useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import NoData from '../NoData/NoData';
import EventAttribute from './components/EventAttribute';

interface IEventsTableProps {
	span: Span;
	startTime: number;
	isSearchVisible: boolean;
}

function EventsTable(props: IEventsTableProps): JSX.Element {
	const { span, startTime, isSearchVisible } = props;
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');
	const [modalContent, setModalContent] = useState<{
		title: string;
		content: string;
	} | null>(null);

	const showAttributeModal = (title: string, content: string): void => {
		setModalContent({ title, content });
	};

	const handleCancel = (): void => {
		setModalContent(null);
	};

	const events = span.event;

	return (
		<div className="events-table">
			{events.length === 0 && (
				<div className="no-events">
					<NoData name="events" />
				</div>
			)}
			<div className="events-container">
				{isSearchVisible && events.length > 0 && (
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
															since trace start
														</Typography.Text>
													</div>
													<div className="timestamp-container">
														<Typography.Text className="attribute-value">
															{getYAxisFormattedValue(
																`${(event.timeUnixNano || 0) / 1e6 - span.timestamp}`,
																'ms',
															)}
														</Typography.Text>
														<Typography.Text className="timestamp-text">
															since span start
														</Typography.Text>
													</div>
												</div>
												{event.attributeMap &&
													Object.keys(event.attributeMap).map((attributeKey) => (
														<EventAttribute
															key={attributeKey}
															attributeKey={attributeKey}
															attributeValue={event.attributeMap[attributeKey]}
															onExpand={showAttributeModal}
														/>
													))}
											</div>
										),
									},
								]}
							/>
						</div>
					))}
			</div>
			<Modal
				title={modalContent?.title}
				open={!!modalContent}
				onCancel={handleCancel}
				footer={null}
				width="80vw"
				centered
			>
				<pre className="attribute-with-expandable-popover__full-view">
					{modalContent?.content}
				</pre>
			</Modal>
		</div>
	);
}

export default EventsTable;

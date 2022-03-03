import { Button, Modal, Collapse } from 'antd';
import React, { useState } from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';
import { CustomSubText, CustomSubTitle } from './styles';

const { Panel } = Collapse;

const ErrorTag = ({ event }: ErrorTagProps) => {
	const [isOpen, setIsOpen] = useState(false);

	const onToggleHandler = (state: boolean) => {
		setIsOpen(state);
	};

	return (
		<>
			{event?.map(({ attributeMap, name }) => {
				const attributes = Object.keys(attributeMap);

				return (
					<Collapse
						accordion
						defaultActiveKey={[name || attributeMap.event]}
						expandIconPosition="right"
						collapsible="header"
					>
						<Panel
							header={name || attributeMap?.event}
							key={name || attributeMap.event}
						>
							{attributes.map((event) => {
								const value = attributeMap[event];
								const isEllipsed = event.length > 24;

								return (
									<>
										<CustomSubTitle>{event}</CustomSubTitle>
										<CustomSubText>{value}</CustomSubText>

										{isEllipsed && (
											<Button
												style={{ padding: 0, marginBottom: '1rem' }}
												onClick={() => onToggleHandler(true)}
												type="link"
											>
												View full log event message
											</Button>
										)}

										<Modal
											onCancel={() => onToggleHandler(false)}
											title="Log Message"
											footer={[]}
											visible={isOpen}
											destroyOnClose
										>
											<CustomSubTitle>{event}</CustomSubTitle>
											<CustomSubText>{value}</CustomSubText>
										</Modal>
									</>
								);
							})}
						</Panel>
					</Collapse>
				);
			})}
		</>
	);
};

interface ErrorTagProps {
	event: ITraceTree['event'];
}

export default ErrorTag;

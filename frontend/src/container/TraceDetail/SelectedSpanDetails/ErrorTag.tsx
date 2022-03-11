import { Button, Collapse, Modal } from 'antd';
import useThemeMode from 'hooks/useThemeMode';
import { keys, map } from 'lodash-es';
import React, { useRef, useState } from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import { CustomSubText, CustomSubTitle } from './styles';
// import Editor from 'components/Editor';

const { Panel } = Collapse;

const ErrorTag = ({ event }: ErrorTagProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const { isDarkMode } = useThemeMode();
	// const useTextRef = useRef('');

	const [text, setText] = useState({
		text: '',
		subText: '',
	});

	const onToggleHandler = (state: boolean) => {
		setIsOpen(state);
	};

	return (
		<>
			{map(event, ({ attributeMap, name }) => {
				const attributes = keys(attributeMap);
				return (
					<Collapse
						defaultActiveKey={[name || attributeMap.event]}
						expandIconPosition="right"
					>
						<Panel
							header={name || attributeMap?.event}
							key={name || attributeMap.event}
						>
							{map(attributes, (event) => {
								const value = attributeMap[event];
								const isEllipsed = value.length > 24;

								return (
									<>
										<CustomSubTitle>{event}</CustomSubTitle>
										<CustomSubText ellipsis={isEllipsed} isDarkMode={isDarkMode}>
											{value}
											<br />
											{isEllipsed && (
												<Button
													style={{ padding: 0, margin: 0 }}
													onClick={() => {
														onToggleHandler(true);
														setText({
															subText: value,
															text: event,
														});
														// useTextRef.current = value;
													}}
													type="link"
												>
													View full log event message
												</Button>
											)}
										</CustomSubText>
									</>
								);
							})}
						</Panel>
					</Collapse>
				);
			})}
			<Modal
				onCancel={() => onToggleHandler(false)}
				title="Log Message"
				visible={isOpen}
				destroyOnClose
				footer={[]}
			>
				<CustomSubTitle>{text.text}</CustomSubTitle>
				<CustomSubText ellipsis={false} isDarkMode={isDarkMode}>
					{text.subText}
				</CustomSubText>
			</Modal>
		</>
	);
};

interface ErrorTagProps {
	event: ITraceTree['event'];
}

export default ErrorTag;

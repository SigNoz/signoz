import { Collapse, Modal } from 'antd';
import Editor from 'components/Editor';
import { StyledButton } from 'components/Styled';
import useThemeMode from 'hooks/useThemeMode';
import keys from 'lodash-es/keys';
import map from 'lodash-es/map';
import React, { useState } from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import { CustomSubText, CustomSubTitle, styles } from './styles';

const { Panel } = Collapse;

function ErrorTag({ event }: ErrorTagProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const { isDarkMode } = useThemeMode();

	const [text, setText] = useState({
		text: '',
		subText: '',
	});

	const onToggleHandler = (state: boolean): void => {
		setIsOpen(state);
	};

	return (
		<>
			{map(event, ({ attributeMap, name }) => {
				const attributes = keys(attributeMap);
				return (
					<Collapse
						key={`${name}${JSON.stringify(attributeMap)}`}
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
												<StyledButton
													styledclass={[styles.removeMargin, styles.removePadding]}
													onClick={(): void => {
														onToggleHandler(true);
														setText({
															subText: value,
															text: event,
														});
													}}
													type="link"
												>
													View full log event message
												</StyledButton>
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
				onCancel={(): void => onToggleHandler(false)}
				title="Log Message"
				visible={isOpen}
				destroyOnClose
				footer={[]}
				width="70vw"
			>
				<CustomSubTitle>{text.text}</CustomSubTitle>

				{text.text === 'exception.stacktrace' ? (
					<Editor onChange={(): void => {}} readOnly value={text.subText} />
				) : (
					<CustomSubText ellipsis={false} isDarkMode={isDarkMode}>
						{text.subText}
					</CustomSubText>
				)}
			</Modal>
		</>
	);
}

interface ErrorTagProps {
	event: ITraceTree['event'];
}

export default ErrorTag;

import { Collapse } from 'antd';
import useThemeMode from 'hooks/useThemeMode';
import keys from 'lodash-es/keys';
import map from 'lodash-es/map';
import React from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import EllipsedButton from './EllipsedButton';
import { CustomSubText, CustomSubTitle } from './styles';

const { Panel } = Collapse;

function ErrorTag({
	event,
	onToggleHandler,
	setText,
}: ErrorTagProps): JSX.Element {
	const { isDarkMode } = useThemeMode();

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
										<CustomSubText
											ellipsis={{
												rows: isEllipsed ? 1 : 0,
											}}
											isDarkMode={isDarkMode}
										>
											{value}
											<br />
											{isEllipsed && (
												<EllipsedButton
													{...{
														event,
														onToggleHandler,
														setText,
														value,
													}}
												/>
											)}
										</CustomSubText>
									</>
								);
							})}
						</Panel>
					</Collapse>
				);
			})}
		</>
	);
}

interface ErrorTagProps {
	event: ITraceTree['event'];
	onToggleHandler: (isOpen: boolean) => void;
	setText: (text: { subText: string; text: string }) => void;
}

export default ErrorTag;

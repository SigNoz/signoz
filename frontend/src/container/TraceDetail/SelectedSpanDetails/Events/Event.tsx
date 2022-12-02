import { InfoCircleOutlined } from '@ant-design/icons';
import { Collapse, Popover, Space } from 'antd';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import useThemeMode from 'hooks/useThemeMode';
import keys from 'lodash-es/keys';
import map from 'lodash-es/map';
import React from 'react';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import EllipsedButton from '../EllipsedButton';
import { CustomSubText, CustomSubTitle } from '../styles';

const { Panel } = Collapse;

function ErrorTag({
	event,
	onToggleHandler,
	setText,
	firstSpanStartTime,
}: ErrorTagProps): JSX.Element {
	const { isDarkMode } = useThemeMode();

	return (
		<>
			{map(event, ({ attributeMap, name, timeUnixNano }) => {
				const attributes = keys(attributeMap);

				const { time, timeUnitName } = convertTimeToRelevantUnit(
					timeUnixNano / 1e6 - firstSpanStartTime,
				);

				return (
					<Collapse
						key={`${name}${JSON.stringify(attributeMap)}`}
						defaultActiveKey={[name || attributeMap.event, 'timestamp']}
						expandIconPosition="right"
					>
						<Panel
							header={name || attributeMap?.event}
							key={name || attributeMap.event}
						>
							<Space direction="horizontal" align="center">
								<CustomSubTitle style={{ margin: 0 }} ellipsis>
									Event Start Time
								</CustomSubTitle>
								<Popover content="Relative to start of the full trace">
									<InfoCircleOutlined />
								</Popover>
							</Space>

							<CustomSubText isDarkMode={isDarkMode}>
								{`${time.toFixed(2)} ${timeUnitName}`}
							</CustomSubText>

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
	firstSpanStartTime: number;
}

export default ErrorTag;

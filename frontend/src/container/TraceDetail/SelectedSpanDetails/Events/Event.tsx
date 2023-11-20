import { Collapse } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import keys from 'lodash-es/keys';
import map from 'lodash-es/map';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import EllipsedButton from '../EllipsedButton';
import { CustomSubText, CustomSubTitle } from '../styles';
import EventStartTime from './EventStartTime';
import RelativeStartTime from './RelativeStartTime';

const { Panel } = Collapse;

function ErrorTag({
	event,
	onToggleHandler,
	setText,
	firstSpanStartTime,
}: ErrorTagProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<>
			{map(event, ({ attributeMap, name, timeUnixNano }) => {
				const attributes = keys(attributeMap);

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
							{firstSpanStartTime ? (
								<RelativeStartTime
									firstSpanStartTime={firstSpanStartTime}
									timeUnixNano={timeUnixNano}
								/>
							) : (
								<EventStartTime timeUnixNano={timeUnixNano} />
							)}

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
	firstSpanStartTime?: number;
}

ErrorTag.defaultProps = {
	firstSpanStartTime: undefined,
};

export default ErrorTag;

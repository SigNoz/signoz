import { Collapse, Tooltip } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { Copy, Check } from 'lucide-react';
import keys from 'lodash-es/keys';
import map from 'lodash-es/map';
import { ITraceTree } from 'types/api/trace/getTraceItem';

import EllipsedButton from '../EllipsedButton';
import { CustomSubText, CustomSubTitle } from '../styles';
import EventStartTime from './EventStartTime';
import RelativeStartTime from './RelativeStartTime';

import '../Tags/Tags.styles.scss';

const { Panel } = Collapse;

function ErrorTag({
	event,
	onToggleHandler,
	setText,
	firstSpanStartTime,
}: ErrorTagProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { copyToClipboard, isCopied, id: copiedId } = useCopyToClipboard();

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
										<CustomSubTitle>
											{event}
											<Tooltip title={isCopied && copiedId === `evt-key-${event}` ? 'Copied!' : 'Copy key'}>
												<span
													className="copy-icon-button"
													role="button"
													tabIndex={0}
													onClick={(): void => copyToClipboard(event, `evt-key-${event}`)}
													onKeyDown={(e): void => {
														if (e.key === 'Enter' || e.key === ' ') copyToClipboard(event, `evt-key-${event}`);
													}}
												>
													{isCopied && copiedId === `evt-key-${event}` ? (
														<Check size={12} />
													) : (
														<Copy size={12} />
													)}
												</span>
											</Tooltip>
										</CustomSubTitle>
										<div className="event-value-container">
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
											<Tooltip title={isCopied && copiedId === `evt-val-${event}` ? 'Copied!' : 'Copy value'}>
												<span
													className="copy-icon-button"
													role="button"
													tabIndex={0}
													onClick={(): void => copyToClipboard(value, `evt-val-${event}`)}
													onKeyDown={(e): void => {
														if (e.key === 'Enter' || e.key === ' ') copyToClipboard(value, `evt-val-${event}`);
													}}
												>
													{isCopied && copiedId === `evt-val-${event}` ? (
														<Check size={12} />
													) : (
														<Copy size={12} />
													)}
												</span>
											</Tooltip>
										</div>
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

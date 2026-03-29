import { Collapse } from "antd";
import { useIsDarkMode } from "hooks/useDarkMode";
import keys from "lodash-es/keys";
import map from "lodash-es/map";
import { ITraceTree } from "types/api/trace/getTraceItem";

import CopyIconButton from "../CopyIconButton";
import EllipsedButton from "../EllipsedButton";
import { CustomSubText, CustomSubTitle } from "../styles";
import EventStartTime from "./EventStartTime";
import RelativeStartTime from "./RelativeStartTime";

import "../Tags/Tags.styles.scss";

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
			{map(event, ({ attributeMap, name, timeUnixNano }, eventIndex) => {
				const attributes = keys(attributeMap);

				return (
					<Collapse
						key={`${name}${JSON.stringify(attributeMap)}`}
						defaultActiveKey={[name || attributeMap.event, "timestamp"]}
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

							{map(attributes, (attrKey) => {
								const value = attributeMap[attrKey];
								const isEllipsed = value.length > 24;
								const uniquePrefix = `evt-${eventIndex}-${attrKey}`;

								return (
									<div key={uniquePrefix}>
										<CustomSubTitle>
											{attrKey}
											<CopyIconButton
												text={attrKey}
												copyId={`${uniquePrefix}-key`}
												label="Copy key"
											/>
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
															event: attrKey,
															onToggleHandler,
															setText,
															value,
														}}
													/>
												)}
											</CustomSubText>
											<CopyIconButton
												text={value}
												copyId={`${uniquePrefix}-val`}
												label="Copy value"
											/>
										</div>
									</div>
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
	event: ITraceTree["event"];
	onToggleHandler: (isOpen: boolean) => void;
	setText: (text: { subText: string; text: string }) => void;
	firstSpanStartTime?: number;
}

ErrorTag.defaultProps = {
	firstSpanStartTime: undefined,
};

export default ErrorTag;

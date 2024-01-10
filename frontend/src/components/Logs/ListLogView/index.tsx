import './ListLogView.styles.scss';

import { blue } from '@ant-design/colors';
import Convert from 'ansi-to-html';
import { Typography } from 'antd';
import LogsExplorerContext from 'container/LogsExplorerContext';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
// utils
import { FlatLogData } from 'lib/logs/flatLogData';
import { MouseEventHandler, useCallback, useMemo, useState } from 'react';
// interfaces
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

// components
import AddToQueryHOC, { AddToQueryHOCProps } from '../AddToQueryHOC';
import LogLinesActionButtons from '../LogLinesActionButtons/LogLinesActionButtons';
import LogStateIndicator, {
	LogType,
} from '../LogStateIndicator/LogStateIndicator';
// styles
import {
	Container,
	LogContainer,
	LogText,
	Text,
	TextContainer,
} from './styles';
import { isValidLogField } from './util';

const convert = new Convert();

interface LogFieldProps {
	fieldKey: string;
	fieldValue: string;
}

type LogSelectedFieldProps = LogFieldProps &
	Pick<AddToQueryHOCProps, 'onAddToQuery'>;

function LogGeneralField({ fieldKey, fieldValue }: LogFieldProps): JSX.Element {
	const html = useMemo(
		() => ({
			__html: convert.toHtml(dompurify.sanitize(fieldValue)),
		}),
		[fieldValue],
	);

	return (
		<TextContainer>
			<Text ellipsis type="secondary" className="log-field-key">
				{`${fieldKey} : `}
			</Text>
			<LogText dangerouslySetInnerHTML={html} className="log-value" />
		</TextContainer>
	);
}

function LogSelectedField({
	fieldKey = '',
	fieldValue = '',
	onAddToQuery,
}: LogSelectedFieldProps): JSX.Element {
	return (
		<div className="log-selected-fields">
			<AddToQueryHOC
				fieldKey={fieldKey}
				fieldValue={fieldValue}
				onAddToQuery={onAddToQuery}
			>
				<Typography.Text>
					<span style={{ color: blue[4] }} className="selected-log-field-key">
						{fieldKey}
					</span>
				</Typography.Text>
			</AddToQueryHOC>
			<Typography.Text ellipsis className="selected-log-kv">
				<span className="selected-log-field-key">{': '}</span>
				<span className="selected-log-value">{fieldValue || "''"}</span>
			</Typography.Text>
		</div>
	);
}

type ListLogViewProps = {
	logData: ILog;
	selectedFields: IField[];
	onSetActiveLog: (log: ILog) => void;
	onAddToQuery: AddToQueryHOCProps['onAddToQuery'];
};

function ListLogView({
	logData,
	selectedFields,
	onSetActiveLog,
	onAddToQuery,
}: ListLogViewProps): JSX.Element {
	const flattenLogData = useMemo(() => FlatLogData(logData), [logData]);

	const [hasActionButtons, setHasActionButtons] = useState<boolean>(false);
	const { isHighlighted, isLogsExplorerPage, onLogCopy } = useCopyLogLink(
		logData.id,
	);
	const {
		activeLog: activeContextLog,
		onSetActiveLog: handleSetActiveContextLog,
		onClearActiveLog: handleClearActiveContextLog,
	} = useActiveLog();

	const handlerClearActiveContextLog: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			handleClearActiveContextLog();
		},
		[handleClearActiveContextLog],
	);

	const handleDetailedView = useCallback(() => {
		console.log('here');
		onSetActiveLog(logData);
	}, [logData, onSetActiveLog]);

	const handleShowContext: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			handleSetActiveContextLog(logData);
		},
		[logData, handleSetActiveContextLog],
	);

	const updatedSelecedFields = useMemo(
		() => selectedFields.filter((e) => e.name !== 'id'),
		[selectedFields],
	);

	const timestampValue = useMemo(
		() =>
			typeof flattenLogData.timestamp === 'string'
				? dayjs(flattenLogData.timestamp).format()
				: dayjs(flattenLogData.timestamp / 1e6).format(),
		[flattenLogData.timestamp],
	);

	const logType = logData?.attributes_string?.log_level || LogType.INFO;

	const handleMouseEnter = (): void => {
		setHasActionButtons(true);
	};

	const handleMouseLeave = (): void => {
		setHasActionButtons(false);
	};

	return (
		<Container
			$isActiveLog={isHighlighted}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onClick={handleDetailedView}
		>
			<div className="log-line">
				<LogStateIndicator type={logType} />
				<div>
					<LogContainer>
						<LogGeneralField fieldKey="Log" fieldValue={flattenLogData.body} />
						{flattenLogData.stream && (
							<LogGeneralField fieldKey="Stream" fieldValue={flattenLogData.stream} />
						)}
						<LogGeneralField fieldKey="Timestamp" fieldValue={timestampValue} />

						{updatedSelecedFields.map((field) =>
							isValidLogField(flattenLogData[field.name] as never) ? (
								<LogSelectedField
									key={field.name}
									fieldKey={field.name}
									fieldValue={flattenLogData[field.name] as never}
									onAddToQuery={onAddToQuery}
								/>
							) : null,
						)}
					</LogContainer>
				</div>
			</div>

			{hasActionButtons && isLogsExplorerPage && (
				<LogLinesActionButtons
					handleShowContext={handleShowContext}
					onLogCopy={onLogCopy}
				/>
			)}
			{activeContextLog && (
				<LogsExplorerContext
					log={activeContextLog}
					onClose={handlerClearActiveContextLog}
				/>
			)}
		</Container>
	);
}

export default ListLogView;

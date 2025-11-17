import './ListLogView.styles.scss';

import { blue } from '@ant-design/colors';
import { Typography } from 'antd';
import cx from 'classnames';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getSanitizedLogBody } from 'container/LogDetailedView/utils';
import { FontSize } from 'container/OptionsMenu/types';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
// utils
import { FlatLogData } from 'lib/logs/flatLogData';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useMemo, useState } from 'react';
// interfaces
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

// components
import AddToQueryHOC, { AddToQueryHOCProps } from '../AddToQueryHOC';
import LogLinesActionButtons from '../LogLinesActionButtons/LogLinesActionButtons';
import LogStateIndicator from '../LogStateIndicator/LogStateIndicator';
import { getLogIndicatorType } from '../LogStateIndicator/utils';
// styles
import {
	Container,
	LogContainer,
	LogText,
	Text,
	TextContainer,
} from './styles';
import { isValidLogField, LogBodyFieldKey, LogTimeFieldKey } from './util';

interface LogFieldProps {
	fieldKey: string;
	fieldValue: string;
	linesPerRow?: number;
	fontSize: FontSize;
}

type LogSelectedFieldProps = Omit<LogFieldProps, 'linesPerRow'> &
	Pick<AddToQueryHOCProps, 'onAddToQuery'> & {
		fieldKeyDisplay: string;
	};

function LogGeneralField({
	fieldKey,
	fieldValue,
	linesPerRow = 1,
	fontSize,
}: LogFieldProps): JSX.Element {
	const html = useMemo(
		() => ({
			__html: getSanitizedLogBody(fieldValue, { shouldEscapeHtml: true }),
		}),
		[fieldValue],
	);

	return (
		<TextContainer>
			<Text ellipsis type="secondary" className={cx('log-field-key', fontSize)}>
				{`${fieldKey} : `}
			</Text>
			<LogText
				dangerouslySetInnerHTML={html}
				className={cx('log-value', fontSize)}
				linesPerRow={linesPerRow > 1 ? linesPerRow : undefined}
			/>
		</TextContainer>
	);
}

function LogSelectedField({
	fieldKey = '',
	fieldValue = '',
	fieldKeyDisplay = '',
	onAddToQuery,
	fontSize,
}: LogSelectedFieldProps): JSX.Element {
	return (
		<div className="log-selected-fields">
			<AddToQueryHOC
				fieldKey={fieldKey}
				fieldValue={fieldValue}
				onAddToQuery={onAddToQuery}
				fontSize={fontSize}
			>
				<Typography.Text>
					<span
						style={{ color: blue[4] }}
						className={cx('selected-log-field-key', fontSize)}
					>
						{fieldKeyDisplay}
					</span>
				</Typography.Text>
			</AddToQueryHOC>
			<Typography.Text ellipsis className={cx('selected-log-kv', fontSize)}>
				<span className={cx('selected-log-field-key', fontSize)}>{': '}</span>
				<span className={cx('selected-log-value', fontSize)}>
					{fieldValue || "''"}
				</span>
			</Typography.Text>
		</div>
	);
}

type ListLogViewProps = {
	logData: ILog;
	selectedFields: IField[];
	onSetActiveLog: (log: ILog) => void;
	onAddToQuery: AddToQueryHOCProps['onAddToQuery'];
	activeLog?: ILog | null;
	linesPerRow: number;
	fontSize: FontSize;
};

function ListLogView({
	logData,
	selectedFields,
	onSetActiveLog,
	onAddToQuery,
	activeLog,
	linesPerRow,
	fontSize,
}: ListLogViewProps): JSX.Element {
	const flattenLogData = useMemo(() => FlatLogData(logData), [logData]);

	const [hasActionButtons, setHasActionButtons] = useState<boolean>(false);
	const { isHighlighted, isLogsExplorerPage, onLogCopy } = useCopyLogLink(
		logData.id,
	);
	const {
		activeLog: activeContextLog,
		onAddToQuery: handleAddToQuery,
		onSetActiveLog: handleSetActiveContextLog,
		onClearActiveLog: handleClearActiveContextLog,
		onGroupByAttribute,
	} = useActiveLog();

	const isDarkMode = useIsDarkMode();

	const handlerClearActiveContextLog = useCallback(
		(event: React.MouseEvent | React.KeyboardEvent) => {
			event.preventDefault();
			event.stopPropagation();
			handleClearActiveContextLog();
		},
		[handleClearActiveContextLog],
	);

	const handleDetailedView = useCallback(() => {
		onSetActiveLog(logData);
	}, [logData, onSetActiveLog]);

	const handleShowContext = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			handleSetActiveContextLog(logData);
		},
		[logData, handleSetActiveContextLog],
	);

	const updatedSelecedFields = useMemo(
		() => selectedFields.filter((e) => e.key !== 'id'),
		[selectedFields],
	);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const timestampValue = useMemo(
		() =>
			typeof flattenLogData[LogTimeFieldKey] === 'string'
				? formatTimezoneAdjustedTimestamp(
						flattenLogData[LogTimeFieldKey],
						DATE_TIME_FORMATS.ISO_DATETIME_MS,
				  )
				: formatTimezoneAdjustedTimestamp(
						flattenLogData[LogTimeFieldKey] / 1e6,
						DATE_TIME_FORMATS.ISO_DATETIME_MS,
				  ),
		[flattenLogData, formatTimezoneAdjustedTimestamp],
	);

	const logType = getLogIndicatorType(logData);

	const handleMouseEnter = (): void => {
		setHasActionButtons(true);
	};

	const handleMouseLeave = (): void => {
		setHasActionButtons(false);
	};

	return (
		<>
			<Container
				$isActiveLog={
					isHighlighted ||
					activeLog?.id === logData.id ||
					activeContextLog?.id === logData.id
				}
				$isDarkMode={isDarkMode}
				$logType={logType}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onClick={handleDetailedView}
				fontSize={fontSize}
			>
				<div className="log-line">
					<LogStateIndicator
						fontSize={fontSize}
						severityText={logData.severity_text}
						severityNumber={logData.severity_number}
					/>
					<div>
						<LogContainer fontSize={fontSize}>
							{updatedSelecedFields.some((field) => field.key === LogBodyFieldKey) && (
								<LogGeneralField
									fieldKey="Log"
									fieldValue={flattenLogData[LogBodyFieldKey]}
									linesPerRow={linesPerRow}
									fontSize={fontSize}
								/>
							)}
							{flattenLogData.stream && (
								<LogGeneralField
									fieldKey="Stream"
									fieldValue={flattenLogData.stream}
									fontSize={fontSize}
								/>
							)}
							{updatedSelecedFields.some((field) => field.key === LogTimeFieldKey) && (
								<LogGeneralField
									fieldKey="Timestamp"
									fieldValue={timestampValue}
									fontSize={fontSize}
								/>
							)}

							{updatedSelecedFields
								.filter(
									(field) => ![LogTimeFieldKey, LogBodyFieldKey].includes(field.key),
								)
								.map((field) =>
									isValidLogField(flattenLogData[field.key] as never) ? (
										<LogSelectedField
											key={field.key}
											fieldKey={field.key}
											fieldKeyDisplay={field.displayName}
											fieldValue={flattenLogData[field.key] as never}
											onAddToQuery={onAddToQuery}
											fontSize={fontSize}
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
			</Container>
			{activeContextLog && (
				<LogDetail
					log={activeContextLog}
					onAddToQuery={handleAddToQuery}
					selectedTab={VIEW_TYPES.CONTEXT}
					onClose={handlerClearActiveContextLog}
					onGroupByAttribute={onGroupByAttribute}
				/>
			)}
		</>
	);
}

ListLogView.defaultProps = {
	activeLog: null,
};

LogGeneralField.defaultProps = {
	linesPerRow: 1,
};

export default ListLogView;

import { Color } from '@signozhq/design-tokens';
import { DrawerProps, Tooltip } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES, VIEWS } from 'components/LogDetail/constants';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getSanitizedLogBody } from 'container/LogDetailedView/utils';
import LogsExplorerContext from 'container/LogsExplorerContext';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import { FlatLogData } from 'lib/logs/flatLogData';
import { isEmpty, isNumber, isUndefined } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';
import {
	KeyboardEvent,
	MouseEvent,
	MouseEventHandler,
	useCallback,
	useMemo,
	useState,
} from 'react';

import LogLinesActionButtons from '../LogLinesActionButtons/LogLinesActionButtons';
import LogStateIndicator from '../LogStateIndicator/LogStateIndicator';
import { getLogIndicatorType } from '../LogStateIndicator/utils';
// styles
import { InfoIconWrapper, RawLogContent, RawLogViewContainer } from './styles';
import { RawLogViewProps } from './types';

function RawLogView({
	isActiveLog,
	isReadOnly,
	data,
	linesPerRow,
	isTextOverflowEllipsisDisabled,
	isHighlighted,
	helpTooltip,
	selectedFields = [],
	fontSize,
	onLogClick,
}: RawLogViewProps): JSX.Element {
	const {
		isHighlighted: isUrlHighlighted,
		isLogsExplorerPage,
		onLogCopy,
	} = useCopyLogLink(data.id);
	const flattenLogData = useMemo(() => FlatLogData(data), [data]);

	const {
		activeLog: activeContextLog,
		onClearActiveLog: handleClearActiveContextLog,
	} = useActiveLog();
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
		onGroupByAttribute,
	} = useActiveLog();

	const [hasActionButtons, setHasActionButtons] = useState<boolean>(false);
	const [selectedTab, setSelectedTab] = useState<VIEWS | undefined>();

	const isDarkMode = useIsDarkMode();
	const isReadOnlyLog = !isLogsExplorerPage || isReadOnly;

	const logType = getLogIndicatorType(data);

	const updatedSelecedFields = useMemo(
		() => selectedFields.filter((e) => e.name !== 'id'),
		[selectedFields],
	);

	const attributesValues = updatedSelecedFields
		.filter((field) => !['timestamp', 'body'].includes(field.name))
		.map((field) => flattenLogData[field.name])
		.filter((attribute) => {
			// loadash isEmpty doesnot work with numbers
			if (isNumber(attribute)) {
				return true;
			}

			return !isUndefined(attribute) && !isEmpty(attribute);
		});

	let attributesText = attributesValues.join(' | ');

	if (attributesText.length > 0) {
		attributesText += ' | ';
	}

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const text = useMemo(() => {
		const parts = [];

		// Check if timestamp is selected
		const showTimestamp = selectedFields.some(
			(field) => field.name === 'timestamp',
		);
		if (showTimestamp) {
			const date =
				typeof data.timestamp === 'string'
					? formatTimezoneAdjustedTimestamp(
							data.timestamp,
							DATE_TIME_FORMATS.ISO_DATETIME_MS,
					  )
					: formatTimezoneAdjustedTimestamp(
							data.timestamp / 1e6,
							DATE_TIME_FORMATS.ISO_DATETIME_MS,
					  );
			parts.push(date);
		}

		// Check if body is selected
		const showBody = selectedFields.some((field) => field.name === 'body');
		if (showBody) {
			parts.push(`${attributesText} ${data.body}`);
		} else {
			parts.push(attributesText);
		}

		return parts.join(' | ');
	}, [
		selectedFields,
		attributesText,
		data.timestamp,
		data.body,
		formatTimezoneAdjustedTimestamp,
	]);

	const handleClickExpand = useCallback(
		(event: MouseEvent) => {
			if (activeContextLog || isReadOnly) return;

			// Use custom click handler if provided, otherwise use default behavior
			if (onLogClick) {
				onLogClick(data, event);
			} else {
				onSetActiveLog(data);
				setSelectedTab(VIEW_TYPES.OVERVIEW);
			}
		},
		[activeContextLog, isReadOnly, data, onSetActiveLog, onLogClick],
	);

	const handleCloseLogDetail: DrawerProps['onClose'] = useCallback(
		(
			event: MouseEvent<Element, globalThis.MouseEvent> | KeyboardEvent<Element>,
		) => {
			event.preventDefault();
			event.stopPropagation();

			onClearActiveLog();
			setSelectedTab(undefined);
		},
		[onClearActiveLog],
	);

	const handleMouseEnter = useCallback(() => {
		if (isReadOnlyLog) return;

		setHasActionButtons(true);
	}, [isReadOnlyLog]);

	const handleMouseLeave = useCallback(() => {
		if (isReadOnlyLog) return;

		setHasActionButtons(false);
	}, [isReadOnlyLog]);

	const handleShowContext: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			// handleSetActiveContextLog(data);
			setSelectedTab(VIEW_TYPES.CONTEXT);
			onSetActiveLog(data);
		},
		[data, onSetActiveLog],
	);

	const html = useMemo(
		() => ({
			__html: getSanitizedLogBody(text, { shouldEscapeHtml: true }),
		}),
		[text],
	);

	return (
		<RawLogViewContainer
			onClick={handleClickExpand}
			wrap={false}
			align="middle"
			$isDarkMode={isDarkMode}
			$isReadOnly={isReadOnly}
			$isHightlightedLog={isUrlHighlighted}
			$isActiveLog={
				activeLog?.id === data.id || activeContextLog?.id === data.id || isActiveLog
			}
			$isCustomHighlighted={isHighlighted}
			$logType={logType}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			fontSize={fontSize}
		>
			<LogStateIndicator
				fontSize={fontSize}
				severityText={data.severity_text}
				severityNumber={data.severity_number}
			/>
			{helpTooltip && (
				<Tooltip title={helpTooltip} placement="top" mouseEnterDelay={0.5}>
					<InfoIconWrapper
						size={14}
						className="help-tooltip-icon"
						color={Color.BG_VANILLA_400}
					/>
				</Tooltip>
			)}

			<RawLogContent
				className="raw-log-content"
				$isReadOnly={isReadOnly}
				$isActiveLog={isActiveLog}
				$isDarkMode={isDarkMode}
				$isTextOverflowEllipsisDisabled={isTextOverflowEllipsisDisabled}
				linesPerRow={linesPerRow}
				fontSize={fontSize}
				dangerouslySetInnerHTML={html}
			/>

			{hasActionButtons && (
				<LogLinesActionButtons
					handleShowContext={handleShowContext}
					onLogCopy={onLogCopy}
				/>
			)}

			{activeContextLog && (
				<LogsExplorerContext
					log={activeContextLog}
					onClose={handleClearActiveContextLog}
				/>
			)}
			{selectedTab && (
				<LogDetail
					selectedTab={selectedTab}
					log={activeLog}
					onClose={handleCloseLogDetail}
					onAddToQuery={onAddToQuery}
					onClickActionItem={onAddToQuery}
					onGroupByAttribute={onGroupByAttribute}
				/>
			)}
		</RawLogViewContainer>
	);
}

RawLogView.defaultProps = {
	isActiveLog: false,
	isReadOnly: false,
	isTextOverflowEllipsisDisabled: false,
	isHighlighted: false,
};

export default RawLogView;

import './RawLogView.styles.scss';

import Convert from 'ansi-to-html';
import { DrawerProps } from 'antd';
import LogDetail from 'components/LogDetail';
import { VIEW_TYPES, VIEWS } from 'components/LogDetail/constants';
import LogsExplorerContext from 'container/LogsExplorerContext';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	KeyboardEvent,
	MouseEvent,
	MouseEventHandler,
	useCallback,
	useMemo,
	useState,
} from 'react';

import LogLinesActionButtons from '../LogLinesActionButtons/LogLinesActionButtons';
import LogStateIndicator, {
	LogType,
} from '../LogStateIndicator/LogStateIndicator';
// styles
import { RawLogContent, RawLogViewContainer } from './styles';
import { RawLogViewProps } from './types';

const convert = new Convert();

function RawLogView({
	isActiveLog,
	isReadOnly,
	data,
	linesPerRow,
	isTextOverflowEllipsisDisabled,
}: RawLogViewProps): JSX.Element {
	const { isHighlighted, isLogsExplorerPage, onLogCopy } = useCopyLogLink(
		data.id,
	);
	const {
		activeLog: activeContextLog,
		onClearActiveLog: handleClearActiveContextLog,
	} = useActiveLog();
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
	} = useActiveLog();

	console.log(activeLog, data.id);

	const [hasActionButtons, setHasActionButtons] = useState<boolean>(false);
	const [selectedTab, setSelectedTab] = useState<VIEWS | undefined>();

	const isDarkMode = useIsDarkMode();
	const isReadOnlyLog = !isLogsExplorerPage || isReadOnly;

	const severityText = data.severity_text ? `${data.severity_text} |` : '';

	const logType = data?.attributes_string?.log_level || LogType.INFO;

	const text = useMemo(
		() =>
			typeof data.timestamp === 'string'
				? `${dayjs(data.timestamp).format()} | ${severityText} ${data.body}`
				: `${dayjs(data.timestamp / 1e6).format()} | ${severityText} ${data.body}`,
		[data.timestamp, data.body, severityText],
	);

	const handleClickExpand = useCallback(() => {
		if (activeContextLog || isReadOnly) return;

		onSetActiveLog(data);
		setSelectedTab(VIEW_TYPES.OVERVIEW);
	}, [activeContextLog, isReadOnly, data, onSetActiveLog]);

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
			__html: convert.toHtml(dompurify.sanitize(text)),
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
			$isHightlightedLog={isHighlighted}
			$isActiveLog={isActiveLog}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<LogStateIndicator
				type={logType}
				isActive={activeLog?.id === data.id || activeContextLog?.id === data.id}
			/>

			<RawLogContent
				$isReadOnly={isReadOnly}
				$isActiveLog={isActiveLog}
				$isDarkMode={isDarkMode}
				$isTextOverflowEllipsisDisabled={isTextOverflowEllipsisDisabled}
				linesPerRow={linesPerRow}
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
				/>
			)}
		</RawLogViewContainer>
	);
}

RawLogView.defaultProps = {
	isActiveLog: false,
	isReadOnly: false,
	isTextOverflowEllipsisDisabled: false,
};

export default RawLogView;

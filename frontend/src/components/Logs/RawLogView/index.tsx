import {
	ExpandAltOutlined,
	LinkOutlined,
	MonitorOutlined,
} from '@ant-design/icons';
import Convert from 'ansi-to-html';
import { Button, DrawerProps, Tooltip } from 'antd';
import LogDetail from 'components/LogDetail';
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

// styles
import {
	ActionButtonsWrapper,
	ExpandIconWrapper,
	RawLogContent,
	RawLogViewContainer,
} from './styles';
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
		onSetActiveLog: handleSetActiveContextLog,
		onClearActiveLog: handleClearActiveContextLog,
	} = useActiveLog();
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
	} = useActiveLog();

	const [hasActionButtons, setHasActionButtons] = useState<boolean>(false);

	const isDarkMode = useIsDarkMode();
	const isReadOnlyLog = !isLogsExplorerPage || isReadOnly;

	const severityText = data.severity_text ? `${data.severity_text} |` : '';

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
	}, [activeContextLog, isReadOnly, data, onSetActiveLog]);

	const handleCloseLogDetail: DrawerProps['onClose'] = useCallback(
		(
			event: MouseEvent<Element, globalThis.MouseEvent> | KeyboardEvent<Element>,
		) => {
			event.preventDefault();
			event.stopPropagation();

			onClearActiveLog();
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
			handleSetActiveContextLog(data);
		},
		[data, handleSetActiveContextLog],
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
			$isActiveLog={isHighlighted}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{!isReadOnly && (
				<ExpandIconWrapper flex="30px">
					<ExpandAltOutlined />
				</ExpandIconWrapper>
			)}

			<RawLogContent
				$isReadOnly={isReadOnly}
				$isActiveLog={isActiveLog}
				$isTextOverflowEllipsisDisabled={isTextOverflowEllipsisDisabled}
				linesPerRow={linesPerRow}
				dangerouslySetInnerHTML={html}
			/>

			{hasActionButtons && (
				<ActionButtonsWrapper>
					<Tooltip title="Show Context">
						<Button
							size="small"
							icon={<MonitorOutlined />}
							onClick={handleShowContext}
						/>
					</Tooltip>
					<Tooltip title="Copy Link">
						<Button size="small" icon={<LinkOutlined />} onClick={onLogCopy} />
					</Tooltip>
				</ActionButtonsWrapper>
			)}

			{activeContextLog && (
				<LogsExplorerContext
					log={activeContextLog}
					onClose={handleClearActiveContextLog}
				/>
			)}
			<LogDetail
				log={activeLog}
				onClose={handleCloseLogDetail}
				onAddToQuery={onAddToQuery}
				onClickActionItem={onAddToQuery}
			/>
		</RawLogViewContainer>
	);
}

RawLogView.defaultProps = {
	isActiveLog: false,
	isReadOnly: false,
	isTextOverflowEllipsisDisabled: false,
};

export default RawLogView;

import {
	ExpandAltOutlined,
	LinkOutlined,
	MonitorOutlined,
} from '@ant-design/icons';
// const Convert = require('ansi-to-html');
import Convert from 'ansi-to-html';
import { Button, Tooltip } from 'antd';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import {
	MouseEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { SET_CURRENT_LOG } from 'types/actions/logs';
// interfaces
import { ILog } from 'types/api/logs/log';
import { GlobalReducer } from 'types/reducer/globalTime';
import ILogsReducer from 'types/reducer/logs';

// styles
import {
	AddButtonWrapper,
	ExpandIconWrapper,
	RawLogContent,
	RawLogViewContainer,
} from './styles';

const convert = new Convert();

interface RawLogViewProps {
	data: ILog;
	linesPerRow: number;
	onClickExpand: (log: ILog) => void;
}

function RawLogView(props: RawLogViewProps): JSX.Element {
	const { data, linesPerRow, onClickExpand } = props;
	const [isAddButtonsVisible, setAddButtonVisible] = useState<boolean>(false);
	const [value, copyToClipboard] = useCopyToClipboard();
	const dispatch = useDispatch();
	const { notifications } = useNotifications();
	useEffect(() => {
		if (value.value) {
			notifications.success({
				message: 'Copied to clipboard',
			});
		}
	}, [value, notifications]);
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { searchFilter } = useSelector<AppState, ILogsReducer>(
		(state) => state.logs,
	);

	const isDarkMode = useIsDarkMode();

	const text = useMemo(
		() => `${dayjs(data.timestamp / 1e6).format()} | ${data.body}`,
		[data.timestamp, data.body],
	);

	const handleClickExpand = useCallback(() => {
		onClickExpand(data);
	}, [onClickExpand, data]);

	const html = useMemo(
		() => ({
			__html: convert.toHtml(dompurify.sanitize(text)),
		}),
		[text],
	);

	const showContextHandler: MouseEventHandler<Element> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		dispatch({
			type: SET_CURRENT_LOG,
			payload: data,
		});
	};

	const copyLinkHandler: MouseEventHandler<Element> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		copyToClipboard(`
			${window.location.origin}/logs?q=${searchFilter.queryString}&startTime=${minTime}&endTime=${maxTime}&selectedLogId=${data.id}
		`);
	};

	const urlQuery = useUrlQuery();
	const startTime = urlQuery.get('startTime');
	console.log('startTime', startTime);

	const showButtons = (): void => {
		setAddButtonVisible(true);
	};

	const hideButtons = (): void => {
		setAddButtonVisible(false);
	};

	return (
		<RawLogViewContainer
			onClick={handleClickExpand}
			wrap={false}
			align="middle"
			$isDarkMode={isDarkMode}
			onMouseOver={showButtons}
			onMouseLeave={hideButtons}
		>
			<ExpandIconWrapper flex="30px">
				<ExpandAltOutlined />
			</ExpandIconWrapper>
			<RawLogContent linesPerRow={linesPerRow} dangerouslySetInnerHTML={html} />
			{isAddButtonsVisible && (
				<AddButtonWrapper>
					<Tooltip title="Show context">
						<Button onClick={showContextHandler}>
							<MonitorOutlined />
						</Button>
					</Tooltip>
					<Tooltip title="Copy link">
						<Button onClick={copyLinkHandler}>
							<LinkOutlined />
						</Button>
					</Tooltip>
				</AddButtonWrapper>
			)}
		</RawLogViewContainer>
	);
}

export default RawLogView;

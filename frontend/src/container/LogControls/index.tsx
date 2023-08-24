import { CloudDownloadOutlined, FastBackwardOutlined } from '@ant-design/icons';
import { Button, Divider, Dropdown, MenuProps } from 'antd';
import { Excel } from 'antd-table-saveas-excel';
import GetLogs from 'api/logs/GetLogs';
import Controls from 'container/Controls';
import { getGlobalTime } from 'container/LogsSearchFilter/utils';
import { getMinMax } from 'container/TopNav/AutoRefresh/config';
import dayjs from 'dayjs';
import { Pagination } from 'hooks/queryPagination';
import { FlatLogData } from 'lib/logs/flatLogData';
import { OrderPreferenceItems } from 'pages/Logs/config';
import { getIdConditions } from 'pages/Logs/utils';
import * as Papa from 'papaparse';
import { memo, useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	GET_NEXT_LOG_LINES,
	GET_PREVIOUS_LOG_LINES,
	RESET_ID_START_AND_END,
	SET_LOG_LINES_PER_PAGE,
} from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ILogsReducer } from 'types/reducer/logs';

import { Container, DownloadLogButton } from './styles';

function LogControls(): JSX.Element | null {
	const {
		logLinesPerPage,
		liveTail,
		isLoading: isLogsLoading,
		isLoadingAggregate,
		logs,
		order,
		searchFilter,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const [isDownloadingAllLogs, setIsDownloadingAllLogs] = useState(false);

	const dispatch = useDispatch<Dispatch<AppActions>>();
	const handleLogLinesPerPageChange = (e: Pagination['limit']): void => {
		dispatch({
			type: SET_LOG_LINES_PER_PAGE,
			payload: {
				logsLinesPerPage: e,
			},
		});
	};

	const handleGoToLatest = (): void => {
		const { maxTime, minTime } = getMinMax(
			globalTime.selectedTime,
			globalTime.minTime,
			globalTime.maxTime,
		);

		const updatedGlobalTime = getGlobalTime(globalTime.selectedTime, {
			maxTime,
			minTime,
		});

		if (updatedGlobalTime) {
			dispatch({
				type: RESET_ID_START_AND_END,
				payload: updatedGlobalTime,
			});
		}
	};

	const handleNavigatePrevious = (): void => {
		dispatch({
			type: GET_PREVIOUS_LOG_LINES,
		});
	};

	const handleNavigateNext = (): void => {
		dispatch({
			type: GET_NEXT_LOG_LINES,
		});
	};

	const getFlattenLogData = (logList: ILog[]): Record<string, string>[] =>
		logList.map((log) => {
			const timestamp =
				typeof log.timestamp === 'string'
					? dayjs(log.timestamp).format()
					: dayjs(log.timestamp / 1e6).format();

			return FlatLogData({
				...log,
				timestamp,
			});
		});

	const flattenLogData = useMemo(() => getFlattenLogData(logs), [logs]);

	const getAllLogs = useCallback(
		async (callback: (logs: Record<string, string>[]) => void): Promise<void> => {
			const allLogs = [];
			const queryLimit = 100000;
			const props = {
				q: searchFilter.queryString,
				limit: queryLimit,
				orderBy: 'timestamp',
				order,
				timestampStart: globalTime?.minTime,
				timestampEnd: globalTime?.maxTime,
			};

			let hasMoreLogs = true;

			while (hasMoreLogs) {
				const idConditions = allLogs.length
					? getIdConditions('', allLogs[allLogs.length - 1].id, order)
					: {};
				/* eslint-disable no-await-in-loop */
				const result = await GetLogs({ ...props, ...idConditions });
				const logs = result.payload;

				if (logs?.length !== queryLimit) {
					hasMoreLogs = false;
				}
				allLogs.push(...(logs ?? []));
			}

			callback(getFlattenLogData(allLogs));
		},
		[searchFilter.queryString, order, globalTime?.minTime, globalTime?.maxTime],
	);

	const downloadExcelFile = useCallback((): void => {
		const headers = Object.keys(Object.assign({}, ...flattenLogData)).map(
			(item) => {
				const updatedTitle = item
					.split('_')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
				return {
					title: updatedTitle,
					dataIndex: item,
				};
			},
		);
		const excel = new Excel();
		excel
			.addSheet('log_data')
			.addColumns(headers)
			.addDataSource(flattenLogData, {
				str2Percent: true,
			})
			.saveAs('log_data.xlsx');
	}, [flattenLogData]);

	const downloadCsvFile = useCallback(
		(event: { key: string }): void => {
			setIsDownloadingAllLogs(true);
			const transformLogData = (logData: Record<string, string>[]): void => {
				const csv = Papa.unparse(logData);
				const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
				const csvUrl = URL.createObjectURL(csvBlob);
				const downloadLink = document.createElement('a');
				downloadLink.href = csvUrl;
				downloadLink.download = 'log_data.csv';
				downloadLink.click();
				downloadLink.remove();
				setIsDownloadingAllLogs(false);
			};
			const isGetAll = event.key === 'download-all-as-csv';
			if (isGetAll) {
				getAllLogs(transformLogData);
			} else {
				transformLogData(flattenLogData);
			}
		},
		[flattenLogData, getAllLogs],
	);

	const menu: MenuProps = useMemo(
		() => ({
			items: [
				{
					key: 'download-as-excel',
					label: 'Excel',
					onClick: downloadExcelFile,
				},
				{
					key: 'download-as-csv',
					label: 'CSV',
					onClick: downloadCsvFile,
				},
				{
					key: 'download-all-as-csv',
					label: 'All Logs (CSV)',
					onClick: downloadCsvFile,
				},
			],
		}),
		[downloadCsvFile, downloadExcelFile],
	);

	const isLoading = isLogsLoading || isLoadingAggregate;

	if (liveTail !== 'STOPPED') {
		return null;
	}

	return (
		<Container>
			<Dropdown menu={menu} trigger={['click']}>
				<DownloadLogButton
					loading={isDownloadingAllLogs || isLoading}
					size="small"
					type="link"
				>
					<CloudDownloadOutlined />
					Download
				</DownloadLogButton>
			</Dropdown>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={order === OrderPreferenceItems.ASC}
				onClick={handleGoToLatest}
			>
				<FastBackwardOutlined /> Go to latest
			</Button>
			<Divider type="vertical" />
			<Controls
				isLoading={isLoading}
				totalCount={logs.length}
				countPerPage={logLinesPerPage}
				handleNavigatePrevious={handleNavigatePrevious}
				handleNavigateNext={handleNavigateNext}
				handleCountItemsPerPageChange={handleLogLinesPerPageChange}
			/>
		</Container>
	);
}

export default memo(LogControls);

import { useCallback, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { message } from 'antd';
import { downloadExportData } from 'api/v1/download/downloadExportData';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

interface ExportOptions {
	format: string;
	rowLimit: number;
	clearSelectColumns: boolean;
}

interface UseExportRawDataProps {
	dataSource: DataSource;
}

interface UseExportRawDataReturn {
	isDownloading: boolean;
	handleExportRawData: (options: ExportOptions) => Promise<void>;
}

export function useExportRawData({
	dataSource,
}: UseExportRawDataProps): UseExportRawDataReturn {
	const [isDownloading, setIsDownloading] = useState<boolean>(false);

	const { stagedQuery } = useQueryBuilder();

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const handleExportRawData = useCallback(
		async ({
			format,
			rowLimit,
			clearSelectColumns,
		}: ExportOptions): Promise<void> => {
			if (!stagedQuery) {
				return;
			}

			try {
				setIsDownloading(true);

				const exportQuery = {
					...stagedQuery,
					builder: {
						...stagedQuery.builder,
						queryData: stagedQuery.builder.queryData.map((qd) => ({
							...qd,
							groupBy: [],
							having: { expression: '' },
							limit: rowLimit,
							...(clearSelectColumns && { selectColumns: [] }),
						})),
						queryTraceOperator: (stagedQuery.builder.queryTraceOperator || []).map(
							(traceOp) => ({
								...traceOp,
								groupBy: [],
								having: { expression: '' },
								limit: rowLimit,
								...(clearSelectColumns && { selectColumns: [] }),
							}),
						),
					},
				};

				const { queryPayload } = prepareQueryRangePayloadV5({
					query: exportQuery,
					graphType: PANEL_TYPES.LIST,
					selectedTime: 'GLOBAL_TIME',
					globalSelectedInterval,
				});

				await downloadExportData({ format, body: queryPayload });
				message.success('Export completed successfully');
			} catch (error) {
				message.error(`Failed to export ${dataSource}. Please try again.`);
			} finally {
				setIsDownloading(false);
			}
		},
		[stagedQuery, globalSelectedInterval, dataSource],
	);

	return { isDownloading, handleExportRawData };
}

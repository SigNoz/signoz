import { message } from 'antd';
import { REQUEST_TYPES } from 'api/v5/queryRange/constants';
import {
	downloadFile,
	getTimestampedFileName,
} from 'lib/exportData/downloadFile';
import { exportScalarData } from 'lib/exportData/exportScalarData';
import { exportTimeseriesData } from 'lib/exportData/exportTimeseriesData';
import { toCsv } from 'lib/exportData/toCsv';
import { toJsonl } from 'lib/exportData/toJsonl';
import { ExportFormat, SerializedTable } from 'lib/exportData/types';
import { useCallback, useState } from 'react';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeResponseV5, TimeSeriesData } from 'types/api/v5/queryRange';

const FORMAT_META: Record<ExportFormat, { mime: string; extension: string }> = {
	[ExportFormat.Csv]: { mime: 'text/csv;charset=utf-8;', extension: 'csv' },
	[ExportFormat.Jsonl]: {
		mime: 'application/x-ndjson;charset=utf-8;',
		extension: 'jsonl',
	},
};

/** The queryRange response object views hold — structural (params left
 * unconstrained) so both explorer variants assign cleanly. */
export type ClientExportData = SuccessResponse<MetricRangePayloadProps> & {
	rawV5Response?: QueryRangeResponseV5;
	legendMap?: Record<string, string>;
};

// Picks the serializer from what the queryRange response carries: timeseries
// queries surface the raw V5 tree (rawV5Response); table queries carry the
// formatForWeb webTables payload (resultType 'scalar'). raw/trace stay
// server-exported via useServerExport.
function serialize(
	data: ClientExportData,
	yAxisUnit?: string,
	query?: Query,
): SerializedTable {
	if (data.rawV5Response?.type === REQUEST_TYPES.TIME_SERIES) {
		return exportTimeseriesData({
			data: data.rawV5Response.data.results as TimeSeriesData[],
			yAxisUnit,
			legendMap: data.legendMap,
			query,
		});
	}

	if (data.payload?.data?.resultType === 'scalar' && query) {
		return exportScalarData({ data, query });
	}

	throw new Error('Export is not supported for this result type');
}

interface UseClientExportProps {
	// currently supports only qb v5 responses. Can extend to support future responses.
	data?: ClientExportData;
	query?: Query;
	yAxisUnit?: string;
	fileName?: string;
}

interface ClientExportOptions {
	format: ExportFormat;
}

interface UseClientExportReturn {
	isExporting: boolean;
	handleExport: (options: ClientExportOptions) => void;
}

export function useClientExport({
	data,
	query,
	yAxisUnit,
	fileName = 'export',
}: UseClientExportProps): UseClientExportReturn {
	const [isExporting, setIsExporting] = useState<boolean>(false);

	const handleExport = useCallback(
		({ format }: ClientExportOptions): void => {
			if (!data) {
				return;
			}

			setIsExporting(true);
			try {
				const table = serialize(data, yAxisUnit, query);
				const content =
					format === ExportFormat.Jsonl ? toJsonl(table) : toCsv(table);
				const { mime, extension } = FORMAT_META[format];
				downloadFile(content, getTimestampedFileName(fileName, extension), mime);
			} catch {
				message.error('Failed to export data. Please try again.');
			} finally {
				setIsExporting(false);
			}
		},
		[data, query, yAxisUnit, fileName],
	);

	return { isExporting, handleExport };
}

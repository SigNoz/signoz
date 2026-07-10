import { message } from 'antd';
import {
	downloadFile,
	getTimestampedFileName,
} from 'lib/exportData/downloadFile';
import { exportTimeseriesData } from 'lib/exportData/exportTimeseriesData';
import { toCsv } from 'lib/exportData/toCsv';
import { toJsonl } from 'lib/exportData/toJsonl';
import { ExportFormat, SerializedTable } from 'lib/exportData/types';
import { useCallback, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeResponseV5, TimeSeriesData } from 'types/api/v5/queryRange';

const FORMAT_META: Record<ExportFormat, { mime: string; extension: string }> = {
	[ExportFormat.Csv]: { mime: 'text/csv;charset=utf-8;', extension: 'csv' },
	[ExportFormat.Jsonl]: {
		mime: 'application/x-ndjson;charset=utf-8;',
		extension: 'jsonl',
	},
};

// Picks the serializer for the response's request type. Narrows the results
// union via the response discriminant. scalar lands with #5591; raw/trace are
// server-exported, distribution is never emitted.
function serialize(
	response: QueryRangeResponseV5,
	yAxisUnit?: string,
	legendMap?: Record<string, string>,
	query?: Query,
): SerializedTable {
	if (response.type === 'time_series') {
		return exportTimeseriesData({
			data: response.data.results as TimeSeriesData[],
			yAxisUnit,
			legendMap,
			query,
		});
	}

	throw new Error(`Export is not supported for "${response.type}" results`);
}

interface UseClientExportProps {
	response?: QueryRangeResponseV5;
	// The builder query behind the response — series names resolve aggregation
	// aliases/expressions from it, exactly like the chart legend.
	query?: Query;
	yAxisUnit?: string;
	fileName?: string;
	legendMap?: Record<string, string>;
}

interface ClientExportOptions {
	format: ExportFormat;
}

interface UseClientExportReturn {
	isExporting: boolean;
	handleExport: (options: ClientExportOptions) => void;
}

// Frontend-driven export: serializes in-memory query results and downloads them
// client-side. Backend-driven export lives in useServerExport.
export function useClientExport({
	response,
	query,
	yAxisUnit,
	fileName = 'export',
	legendMap,
}: UseClientExportProps): UseClientExportReturn {
	const [isExporting, setIsExporting] = useState<boolean>(false);

	const handleExport = useCallback(
		({ format }: ClientExportOptions): void => {
			if (!response) {
				return;
			}

			setIsExporting(true);
			try {
				const table = serialize(response, yAxisUnit, legendMap, query);
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
		[response, query, yAxisUnit, fileName, legendMap],
	);

	return { isExporting, handleExport };
}

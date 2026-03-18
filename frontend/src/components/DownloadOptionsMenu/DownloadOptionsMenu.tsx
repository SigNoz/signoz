import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Button, message, Popover, Radio, Tooltip, Typography } from 'antd';
import { downloadExportData } from 'api/v1/download/downloadExportData';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Download, DownloadIcon, Loader2 } from 'lucide-react';
import { AppState } from 'store/reducers';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	DownloadColumnsScopes,
	DownloadFormats,
	DownloadRowCounts,
} from './constants';

import './DownloadOptionsMenu.styles.scss';

interface DownloadOptionsMenuProps {
	stagedQuery: Query | null;
	dataSource: DataSource;
}

export default function DownloadOptionsMenu({
	stagedQuery,
	dataSource,
}: DownloadOptionsMenuProps): JSX.Element {
	const [exportFormat, setExportFormat] = useState<string>(DownloadFormats.CSV);
	const [rowLimit, setRowLimit] = useState<number>(DownloadRowCounts.TEN_K);
	const [columnsScope, setColumnsScope] = useState<string>(
		DownloadColumnsScopes.ALL,
	);
	const [isDownloading, setIsDownloading] = useState<boolean>(false);
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const handleExportRawData = useCallback(async (): Promise<void> => {
		setIsPopoverOpen(false);
		if (!stagedQuery) {
			return;
		}

		try {
			setIsDownloading(true);

			const clearSelectColumns = columnsScope === DownloadColumnsScopes.ALL;

			const exportQuery: Query = {
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

			await downloadExportData({ format: exportFormat, body: queryPayload });
			message.success('Export completed successfully');
		} catch (error) {
			console.error(`Error exporting ${dataSource}:`, error);
			message.error(`Failed to export ${dataSource}. Please try again.`);
		} finally {
			setIsDownloading(false);
		}
	}, [
		stagedQuery,
		columnsScope,
		exportFormat,
		rowLimit,
		globalSelectedInterval,
		dataSource,
	]);

	const popoverContent = useMemo(
		() => (
			<div
				className="export-options-container"
				role="dialog"
				aria-label="Export options"
				aria-modal="true"
			>
				<div className="export-format">
					<Typography.Text className="title">FORMAT</Typography.Text>
					<Radio.Group
						value={exportFormat}
						onChange={(e): void => setExportFormat(e.target.value)}
					>
						<Radio value={DownloadFormats.CSV}>csv</Radio>
						<Radio value={DownloadFormats.JSONL}>jsonl</Radio>
					</Radio.Group>
				</div>

				<div className="horizontal-line" />

				<div className="row-limit">
					<Typography.Text className="title">Number of Rows</Typography.Text>
					<Radio.Group
						value={rowLimit}
						onChange={(e): void => setRowLimit(e.target.value)}
					>
						<Radio value={DownloadRowCounts.TEN_K}>10k</Radio>
						<Radio value={DownloadRowCounts.THIRTY_K}>30k</Radio>
						<Radio value={DownloadRowCounts.FIFTY_K}>50k</Radio>
					</Radio.Group>
				</div>

				<div className="horizontal-line" />

				<div className="columns-scope">
					<Typography.Text className="title">Columns</Typography.Text>
					<Radio.Group
						value={columnsScope}
						onChange={(e): void => setColumnsScope(e.target.value)}
					>
						<Radio value={DownloadColumnsScopes.ALL}>All</Radio>
						<Radio value={DownloadColumnsScopes.SELECTED}>Selected</Radio>
					</Radio.Group>
				</div>

				<Button
					type="primary"
					icon={<Download size={16} />}
					onClick={handleExportRawData}
					className="export-button"
					disabled={isDownloading}
					loading={isDownloading}
				>
					Export
				</Button>
			</div>
		),
		[exportFormat, rowLimit, columnsScope, isDownloading, handleExportRawData],
	);

	return (
		<Popover
			content={popoverContent}
			trigger="click"
			placement="bottomRight"
			arrow={false}
			open={isPopoverOpen}
			onOpenChange={setIsPopoverOpen}
			rootClassName="download-popover"
		>
			<Tooltip title="Download" placement="top">
				<Button
					className="periscope-btn ghost"
					icon={
						isDownloading ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<DownloadIcon size={14} />
						)
					}
					data-testid={`periscope-btn-download-${dataSource}`}
					disabled={isDownloading}
				/>
			</Tooltip>
		</Popover>
	);
}

import './LogsDownloadOptionsMenu.styles.scss';

import { Button, message, Popover, Radio, Tooltip, Typography } from 'antd';
import { downloadExportData } from 'api/v1/download/downloadExportData';
import { Download, DownloadIcon, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import {
	DownloadColumnsScopes,
	DownloadFormats,
	DownloadRowCounts,
} from './constants';

function convertTelemetryFieldKeyToText(key: TelemetryFieldKey): string {
	const prefix = key.fieldContext ? `${key.fieldContext}.` : '';
	const suffix = key.fieldDataType ? `:${key.fieldDataType}` : '';
	return `${prefix}${key.name}${suffix}`;
}

interface LogsDownloadOptionsMenuProps {
	startTime: number;
	endTime: number;
	filter: string;
	columns: TelemetryFieldKey[];
	orderBy: string;
}

export default function LogsDownloadOptionsMenu({
	startTime,
	endTime,
	filter,
	columns,
	orderBy,
}: LogsDownloadOptionsMenuProps): JSX.Element {
	const [exportFormat, setExportFormat] = useState<string>(DownloadFormats.CSV);
	const [rowLimit, setRowLimit] = useState<number>(DownloadRowCounts.TEN_K);
	const [columnsScope, setColumnsScope] = useState<string>(
		DownloadColumnsScopes.ALL,
	);
	const [isDownloading, setIsDownloading] = useState<boolean>(false);
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const handleExportRawData = useCallback(async (): Promise<void> => {
		setIsPopoverOpen(false);
		try {
			setIsDownloading(true);
			const downloadOptions = {
				source: 'logs',
				start: startTime,
				end: endTime,
				columns:
					columnsScope === DownloadColumnsScopes.SELECTED
						? columns.map((col) => convertTelemetryFieldKeyToText(col))
						: [],
				filter,
				orderBy,
				format: exportFormat,
				limit: rowLimit,
			};

			await downloadExportData(downloadOptions);
			message.success('Export completed successfully');
		} catch (error) {
			console.error('Error exporting logs:', error);
			message.error('Failed to export logs. Please try again.');
		} finally {
			setIsDownloading(false);
		}
	}, [
		startTime,
		endTime,
		columnsScope,
		columns,
		filter,
		orderBy,
		exportFormat,
		rowLimit,
		setIsDownloading,
		setIsPopoverOpen,
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
			rootClassName="logs-download-popover"
		>
			<Tooltip title="Download" placement="top">
				<Button
					className="periscope-btn ghost"
					icon={
						isDownloading ? (
							<Loader2 size={18} className="animate-spin" />
						) : (
							<DownloadIcon size={15} />
						)
					}
					data-testid="periscope-btn-download-options"
					disabled={isDownloading}
				/>
			</Tooltip>
		</Popover>
	);
}

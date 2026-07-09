import { Download, LoaderCircle } from '@signozhq/icons';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Typography } from '@signozhq/ui/typography';
import { Button, Popover, Tooltip } from 'antd';
import { useClientExport } from 'hooks/useExportData/useClientExport';
import { ExportFormat } from 'lib/exportData/types';
import { useCallback, useMemo, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeResponseV5 } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import './TimeseriesExportMenu.styles.scss';

interface TimeseriesExportMenuProps {
	dataSource: DataSource;
	queryResponse: QueryRangeResponseV5;
	query?: Query;
	yAxisUnit?: string;
	legendMap?: Record<string, string>;
	fileName?: string;
}

// Download menu for in-memory timeseries data (client-side serialization).
// The raw/list backend export keeps its own menu in DownloadOptionsMenu.
export default function TimeseriesExportMenu({
	dataSource,
	queryResponse,
	query,
	yAxisUnit,
	legendMap,
	fileName,
}: TimeseriesExportMenuProps): JSX.Element {
	const [exportFormat, setExportFormat] = useState<string>(ExportFormat.Csv);
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const { isExporting, handleExport: handleClientExport } = useClientExport({
		response: queryResponse,
		query,
		yAxisUnit,
		legendMap,
		fileName,
	});

	const handleExport = useCallback((): void => {
		setIsPopoverOpen(false);
		handleClientExport({ format: exportFormat as ExportFormat });
	}, [exportFormat, handleClientExport]);

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
					<RadioGroup value={exportFormat} onChange={setExportFormat}>
						<RadioGroupItem value={ExportFormat.Csv}>csv</RadioGroupItem>
						<RadioGroupItem value={ExportFormat.Jsonl}>jsonl</RadioGroupItem>
					</RadioGroup>
				</div>

				<Button
					type="primary"
					icon={<Download size={16} />}
					onClick={handleExport}
					className="export-button"
					disabled={isExporting}
					loading={isExporting}
				>
					Export
				</Button>
			</div>
		),
		[exportFormat, isExporting, handleExport],
	);

	return (
		<Popover
			content={popoverContent}
			trigger="click"
			placement="bottomRight"
			arrow={false}
			open={isPopoverOpen}
			onOpenChange={setIsPopoverOpen}
			rootClassName="timeseries-export-popover"
		>
			<Tooltip title="Download" placement="top">
				<Button
					className="periscope-btn ghost"
					icon={
						isExporting ? (
							<LoaderCircle size={14} className="animate-spin" />
						) : (
							<Download size={14} />
						)
					}
					data-testid={`timeseries-export-${dataSource}`}
					disabled={isExporting}
				/>
			</Tooltip>
		</Popover>
	);
}

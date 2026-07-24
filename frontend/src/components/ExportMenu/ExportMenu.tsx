import { Download } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui/popover';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import {
	ClientExportData,
	useClientExport,
} from 'hooks/useExportData/useClientExport';
import { ExportFormat } from 'lib/exportData/types';
import { useCallback, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import './ExportMenu.styles.scss';

interface ExportMenuProps {
	dataSource: DataSource;
	// The queryRange response object the view holds — the hook picks the
	// serializer (timeseries / table) from what it carries.
	data: ClientExportData;
	query?: Query;
	yAxisUnit?: string;
	fileName?: string;
}

// Download menu for in-memory query results (client-side serialization).
// The raw/list backend export keeps its own menu in DownloadOptionsMenu.
export default function ExportMenu({
	dataSource,
	data,
	query,
	yAxisUnit,
	fileName,
}: ExportMenuProps): JSX.Element {
	const [exportFormat, setExportFormat] = useState<string>(ExportFormat.Csv);
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const { isExporting, handleExport: handleClientExport } = useClientExport({
		data,
		query,
		yAxisUnit,
		fileName,
	});

	const handleExport = useCallback((): void => {
		setIsPopoverOpen(false);
		handleClientExport({ format: exportFormat as ExportFormat });
	}, [exportFormat, handleClientExport]);

	return (
		<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
			<TooltipSimple title="Download">
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						aria-label="Download"
						data-testid={`export-menu-${dataSource}`}
						disabled={isExporting}
						loading={isExporting}
					>
						<Download size={14} />
					</Button>
				</PopoverTrigger>
			</TooltipSimple>
			<PopoverContent align="end" className="export-menu-popover">
				<div className="export-format">
					<Typography.Text className="title">FORMAT</Typography.Text>
					<RadioGroup value={exportFormat} onChange={setExportFormat}>
						<RadioGroupItem value={ExportFormat.Csv}>csv</RadioGroupItem>
						<RadioGroupItem value={ExportFormat.Jsonl}>jsonl</RadioGroupItem>
					</RadioGroup>
				</div>

				<Button
					variant="solid"
					color="primary"
					className="export-button"
					onClick={handleExport}
					disabled={isExporting}
					loading={isExporting}
					prefix={<Download size={16} />}
				>
					Export
				</Button>
			</PopoverContent>
		</Popover>
	);
}

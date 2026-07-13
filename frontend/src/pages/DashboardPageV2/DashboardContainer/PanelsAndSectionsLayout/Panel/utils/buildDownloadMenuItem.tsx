import {
	CloudDownload,
	FileCode,
	FileImage,
	FileSpreadsheet,
} from '@signozhq/icons';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import {
	DownloadFormat,
	type PanelActionCapabilities,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';

const DOWNLOAD_FORMAT_OPTIONS: {
	format: DownloadFormat;
	label: string;
	icon: JSX.Element;
}[] = [
	{
		format: DownloadFormat.CSV,
		label: 'Download as CSV',
		icon: <FileSpreadsheet size={14} />,
	},
	{
		format: DownloadFormat.PNG,
		label: 'Download as PNG',
		icon: <FileImage size={14} />,
	},
	{
		format: DownloadFormat.SVG,
		label: 'Download as SVG',
		icon: <FileCode size={14} />,
	},
];

interface DownloadMenuItemArgs {
	supported?: PanelActionCapabilities['download'];
	onDownload: (format: DownloadFormat) => void;
}

/**
 * The "Download" submenu: one option per format the kind supports, each handing
 * the format to `onDownload`. Null when the kind supports no format.
 */
export function buildDownloadMenuItem({
	supported,
	onDownload,
}: DownloadMenuItemArgs): MenuItem | null {
	if (!supported) {
		return null;
	}

	const children: MenuItem[] = DOWNLOAD_FORMAT_OPTIONS.filter(
		({ format }) => supported[format],
	).map(({ format, label, icon }) => ({
		key: `download-${format}`,
		label,
		icon,
		onClick: (): void => onDownload(format),
	}));

	if (children.length === 0) {
		return null;
	}
	return {
		key: 'download',
		label: 'Download',
		icon: <CloudDownload size={14} />,
		children,
	};
}

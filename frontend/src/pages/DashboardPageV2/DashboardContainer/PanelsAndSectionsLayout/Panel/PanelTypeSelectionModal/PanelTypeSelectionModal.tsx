import { Modal } from 'antd';
import {
	BarChart,
	ChartLine,
	ChartPie,
	Hash,
	List,
	Table,
} from '@signozhq/icons';

import styles from './PanelTypeSelectionModal.module.scss';

interface PanelType {
	pluginKind: string;
	label: string;
	icon: JSX.Element;
}

const PANEL_TYPES: PanelType[] = [
	{
		pluginKind: 'signoz/TimeSeriesPanel',
		label: 'Time Series',
		icon: <ChartLine size={16} />,
	},
	{ pluginKind: 'signoz/NumberPanel', label: 'Value', icon: <Hash size={16} /> },
	{ pluginKind: 'signoz/TablePanel', label: 'Table', icon: <Table size={16} /> },
	{
		pluginKind: 'signoz/BarChartPanel',
		label: 'Bar Chart',
		icon: <BarChart size={16} />,
	},
	{
		pluginKind: 'signoz/PieChartPanel',
		label: 'Pie Chart',
		icon: <ChartPie size={16} />,
	},
	{
		pluginKind: 'signoz/HistogramPanel',
		label: 'Histogram',
		icon: <BarChart size={16} />,
	},
	{ pluginKind: 'signoz/ListPanel', label: 'List', icon: <List size={16} /> },
];

interface PanelTypeSelectionModalProps {
	open: boolean;
	onClose: () => void;
	onSelect: (pluginKind: string) => void;
}

function PanelTypeSelectionModal({
	open,
	onClose,
	onSelect,
}: PanelTypeSelectionModalProps): JSX.Element {
	return (
		<Modal
			open={open}
			title="Select a panel type"
			onCancel={onClose}
			footer={null}
			destroyOnClose
		>
			<div className={styles.grid}>
				{PANEL_TYPES.map((type) => (
					<button
						key={type.pluginKind}
						type="button"
						className={styles.typeButton}
						data-testid={`panel-type-${type.pluginKind}`}
						onClick={(): void => onSelect(type.pluginKind)}
					>
						{type.icon}
						{type.label}
					</button>
				))}
			</div>
		</Modal>
	);
}

export default PanelTypeSelectionModal;

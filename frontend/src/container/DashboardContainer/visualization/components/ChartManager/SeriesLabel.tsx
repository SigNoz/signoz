import { Tooltip } from 'antd';

import './ChartManager.styles.scss';

interface SeriesLabelProps {
	label: string;
	labelIndex: number;
	onClick: (idx: number) => void;
	disabled?: boolean;
}

export function SeriesLabel({
	label,
	labelIndex,
	onClick,
	disabled,
}: SeriesLabelProps): JSX.Element {
	return (
		<Tooltip placement="topLeft" title={label}>
			<button
				className="chart-manager-series-label"
				disabled={disabled}
				type="button"
				data-testid={`series-label-button-${labelIndex}`}
				onClick={(): void => onClick(labelIndex)}
			>
				{label}
			</button>
		</Tooltip>
	);
}

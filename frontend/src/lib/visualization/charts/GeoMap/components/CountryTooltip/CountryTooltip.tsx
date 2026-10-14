import { ReactNode } from 'react';

import { GeoMapDatum, GeoMapSizeMetric } from '../../types';
import { GeoMapRank } from '../../utils/scales';
import { buildTooltipStats } from './tooltipStats';

import styles from './CountryTooltip.module.scss';

interface CountryTooltipProps {
	datum: GeoMapDatum;
	name: string;
	color: string | null;
	rank: GeoMapRank | undefined;
	total: number;
	formatValue: (value: number) => string;
	valueLabel?: string;
	sizeMetric?: GeoMapSizeMetric;
	footer?: ReactNode;
}

export default function CountryTooltip({
	datum,
	name,
	color,
	rank,
	total,
	formatValue,
	valueLabel,
	sizeMetric,
	footer,
}: CountryTooltipProps): JSX.Element {
	const stats = buildTooltipStats({ datum, rank, total, sizeMetric });

	return (
		<div className={styles.container} data-testid="geo-map-tooltip">
			<div className={styles.header}>
				<span className={styles.name} title={name}>
					{name}
				</span>
				<span className={styles.code}>{datum.code}</span>
			</div>
			<div className={styles.title}>
				<span
					className={styles.marker}
					style={{ borderColor: color ?? undefined, background: color ?? undefined }}
				/>
				{valueLabel && sizeMetric && (
					<span className={styles.metricLabel}>{valueLabel}</span>
				)}
				<span className={styles.value} data-testid="geo-map-tooltip-value">
					{formatValue(datum.value)}
				</span>
			</div>

			{stats.length > 0 && (
				<>
					<span className={styles.divider} />
					<div className={styles.rows}>
						{stats.map((stat) => (
							<div key={stat.label} className={styles.row} data-testid={stat.testId}>
								<span className={styles.rowLabel}>{stat.label}</span>
								<span className={styles.rowSeparator} />
								<span className={styles.rowValue}>{stat.value}</span>
							</div>
						))}
					</div>
				</>
			)}

			{footer}
		</div>
	);
}

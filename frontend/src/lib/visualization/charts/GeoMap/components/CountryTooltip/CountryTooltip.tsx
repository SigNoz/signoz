import { ReactNode } from 'react';

import { GeoMapDatum, GeoMapSizeMetric } from '../../types';
import { buildTooltipStats } from './tooltipStats';

import styles from './CountryTooltip.module.scss';

interface CountryTooltipProps {
	datum: GeoMapDatum;
	name: string;
	color: string | null;
	formatValue: (value: number) => string;
	valueLabel?: string;
	sizeMetric?: GeoMapSizeMetric;
	/** Shown under the name in place of the code, e.g. a point's coordinates. */
	place?: string;
	footer?: ReactNode;
}

export default function CountryTooltip({
	datum,
	name,
	color,
	formatValue,
	valueLabel,
	sizeMetric,
	place,
	footer,
}: CountryTooltipProps): JSX.Element {
	const stats = buildTooltipStats({ datum, sizeMetric });

	return (
		<div className={styles.container} data-testid="geo-map-tooltip">
			<div className={styles.heading}>
				<div className={styles.header}>
					<span className={styles.place}>
						<span
							className={styles.marker}
							style={{
								borderColor: color ?? undefined,
								background: color ?? undefined,
							}}
						/>
						<span className={styles.name} title={name}>
							{name}
						</span>
					</span>
					{!place && <span className={styles.code}>{datum.code}</span>}
				</div>
				{place && <span className={styles.subtitle}>{place}</span>}
			</div>
			<span className={styles.divider} />
			<div className={styles.rows}>
				<div className={styles.row} data-testid="geo-map-tooltip-value">
					<span className={styles.rowLabel}>{valueLabel ?? 'Value'}</span>
					<span className={styles.rowSeparator} />
					<span className={styles.value}>{formatValue(datum.value)}</span>
				</div>
				{stats.map((stat) => (
					<div key={stat.label} className={styles.row} data-testid={stat.testId}>
						<span className={styles.rowLabel}>{stat.label}</span>
						<span className={styles.rowSeparator} />
						<span className={styles.rowValue}>{stat.value}</span>
					</div>
				))}
			</div>

			{footer}
		</div>
	);
}

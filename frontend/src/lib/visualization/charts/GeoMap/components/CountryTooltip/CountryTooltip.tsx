import { ReactNode } from 'react';

import { GeoMapDatum } from '../../types';
import { GeoMapRank } from '../../utils/scales';

import styles from './CountryTooltip.module.scss';

interface CountryTooltipProps {
	datum: GeoMapDatum;
	name: string;
	color: string | null;
	rank: GeoMapRank | undefined;
	total: number;
	formatValue: (value: number) => string;
	footer?: ReactNode;
}

export default function CountryTooltip({
	datum,
	name,
	color,
	rank,
	total,
	formatValue,
	footer,
}: CountryTooltipProps): JSX.Element {
	const stats = rank
		? [
				{ label: 'Rank', value: `#${rank.rank} of ${total}` },
				{ label: 'Share of total', value: `${(rank.share * 100).toFixed(1)}%` },
			]
		: [];

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
				<span className={styles.value} data-testid="geo-map-tooltip-value">
					{formatValue(datum.value)}
				</span>
			</div>

			{stats.length > 0 && (
				<>
					<span className={styles.divider} />
					<div className={styles.rows}>
						{stats.map((stat) => (
							<div key={stat.label} className={styles.row}>
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

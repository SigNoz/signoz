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
}

export default function CountryTooltip({
	datum,
	name,
	color,
	rank,
	total,
	formatValue,
}: CountryTooltipProps): JSX.Element {
	return (
		<div className={styles.content} data-testid="geo-map-tooltip">
			<div className={styles.title}>
				<span
					className={styles.swatch}
					style={{ background: color ?? undefined }}
				/>
				<span>{name}</span>
				<span className={styles.code}>{datum.code}</span>
			</div>
			<div className={styles.value}>{formatValue(datum.value)}</div>
			{rank && (
				<div className={styles.meta}>
					#{rank.rank} of {total} · {(rank.share * 100).toFixed(1)}% of total
				</div>
			)}
			<div className={styles.footer}>Click to drilldown</div>
		</div>
	);
}

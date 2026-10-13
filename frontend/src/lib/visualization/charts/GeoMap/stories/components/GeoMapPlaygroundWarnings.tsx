import { GeoMapDatum } from '../../types';
import { FixtureRow } from '../fixtures/types';

import styles from './GeoMapPlayground.module.scss';

interface GeoMapPlaygroundWarningsProps {
	unmapped: FixtureRow[];
	duplicates: FixtureRow[];
	outside: GeoMapDatum[];
}

const preview = (values: string[]): string =>
	values.slice(0, 5).join(', ') + (values.length > 5 ? ', …' : '');

const shownRaw = (row: FixtureRow): string =>
	row.raw === null ? '(null)' : row.raw.trim() === '' ? '(empty)' : row.raw;

export default function GeoMapPlaygroundWarnings({
	unmapped,
	duplicates,
	outside,
}: GeoMapPlaygroundWarningsProps): JSX.Element | null {
	const warnings = [
		unmapped.length > 0 &&
			`${unmapped.length} rows couldn't be placed: ${preview(unmapped.map(shownRaw))}`,
		duplicates.length > 0 &&
			`${duplicates.length} rows repeat a location; the first is shown: ${preview(duplicates.map(shownRaw))}`,
		outside.length > 0 &&
			`${outside.length} locations outside this view: ${preview(outside.map((datum) => datum.code))}`,
	].filter((warning): warning is string => Boolean(warning));

	if (warnings.length === 0) {
		return null;
	}

	return (
		<details className={styles.warnings} data-testid="geo-map-warnings">
			<summary>⚠ {warnings.length}</summary>
			<ul>
				{warnings.map((warning) => (
					<li key={warning}>{warning}</li>
				))}
			</ul>
		</details>
	);
}

import { useMemo, useState } from 'react';

import { COUNTRIES } from '../../geo/countries';

import styles from './GeoMapPlayground.module.scss';

const formatBox = ([[w, s], [e, n]]: [
	[number, number],
	[number, number],
]): string => `${w}, ${s} → ${e}, ${n}`;

/** Every shape in the bundled outlines asset with the properties the renderer reads. */
export default function GeoMapAssetTable(): JSX.Element {
	const [query, setQuery] = useState('');
	const rows = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return COUNTRIES.filter(({ properties }) =>
			[properties.code, properties.iso3, properties.name, ...properties.regions]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(needle)),
		);
	}, [query]);

	return (
		<div className={styles.page}>
			<input
				className={styles.filter}
				placeholder="Filter by code, name or region"
				aria-label="Filter shapes"
				value={query}
				onChange={(event): void => setQuery(event.target.value)}
				data-testid="geo-asset-filter"
			/>
			<span>
				{' '}
				{rows.length} of {COUNTRIES.length} shapes
			</span>
			<table className={styles.table} data-testid="geo-asset-table">
				<thead>
					<tr>
						<th>code</th>
						<th>iso3</th>
						<th>name</th>
						<th>regions</th>
						<th>label [lon, lat]</th>
						<th>mainland bounds</th>
						<th>full bounds</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ id, properties }) => (
						<tr key={id}>
							<td>{properties.code ?? '—'}</td>
							<td>{properties.iso3 ?? '—'}</td>
							<td>{properties.name}</td>
							<td>{properties.regions.join(', ')}</td>
							<td>{properties.label.join(', ')}</td>
							<td>{formatBox(properties.mainland)}</td>
							<td>{formatBox(properties.bounds)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

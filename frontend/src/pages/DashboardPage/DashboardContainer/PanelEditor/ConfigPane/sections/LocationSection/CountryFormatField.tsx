import { useState } from 'react';
import { ChevronRight } from '@signozhq/icons';
import { DashboardtypesGeoMapCountryFormatDTO } from 'api/generated/services/sigNoz.schemas';

import ChangedDot from '../../controls/ChangedDot/ChangedDot';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';

import styles from './LocationSection.module.scss';

const FORMAT = DashboardtypesGeoMapCountryFormatDTO;

const FORMAT_OPTIONS = [
	{ value: FORMAT.auto, label: 'Auto' },
	{ value: FORMAT.alpha2, label: 'US', ariaLabel: 'Alpha-2' },
	{ value: FORMAT.alpha3, label: 'USA', ariaLabel: 'Alpha-3' },
	{ value: FORMAT.name, label: 'Name' },
];

const FORMAT_SUMMARY: Record<DashboardtypesGeoMapCountryFormatDTO, string> = {
	auto: 'Auto',
	alpha2: 'Alpha-2',
	alpha3: 'Alpha-3',
	name: 'Name',
};

interface CountryFormatFieldProps {
	value: DashboardtypesGeoMapCountryFormatDTO | undefined;
	onChange: (format: DashboardtypesGeoMapCountryFormatDTO) => void;
}

/** How country values are written; collapsed, since Auto reads every format. */
function CountryFormatField({
	value,
	onChange,
}: CountryFormatFieldProps): JSX.Element {
	const format = value ?? FORMAT.auto;
	const [isOpen, setIsOpen] = useState(format !== FORMAT.auto);

	return (
		<div className={styles.group}>
			<button
				type="button"
				className={styles.disclosure}
				aria-expanded={isOpen}
				data-testid="panel-editor-v2-geo-location-country-format-toggle"
				onClick={(): void => setIsOpen((open) => !open)}
			>
				<span className={styles.chevron} data-open={isOpen}>
					<ChevronRight size={14} />
				</span>
				Country code format
				{format !== FORMAT.auto && <ChangedDot />}
				<span className={styles.grow} />
				<span className={styles.muted}>{FORMAT_SUMMARY[format]}</span>
			</button>
			{isOpen && (
				<>
					<ConfigTiles
						testId="panel-editor-v2-geo-location-country-format"
						aria-label="Country code format"
						compact
						value={format}
						items={FORMAT_OPTIONS}
						onChange={onChange}
					/>
					<span className={styles.muted}>
						Only change this if Auto reads your values wrong.
					</span>
				</>
			)}
		</div>
	);
}

export default CountryFormatField;

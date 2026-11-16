import ConfigField from '../../../controls/ConfigField/ConfigField';
import ConfigSelect from '../../../controls/ConfigSelect/ConfigSelect';
import { STATE_COUNTRY_OPTIONS } from '../utils/options';

import styles from '../LocationSection.module.scss';

interface StatesOfFieldProps {
	value: string | undefined;
	onChange: (country: string) => void;
}

/** The one country state rows draw inside. */
function StatesOfField({ value, onChange }: StatesOfFieldProps): JSX.Element {
	return (
		<ConfigField
			label="States of"
			help={
				value ? (
					'The map zooms to this country.'
				) : (
					<span className={styles.error}>
						States only draw inside one country. Pick the country.
					</span>
				)
			}
		>
			<ConfigSelect
				testId="panel-editor-v2-geo-location-view-country"
				showSearch
				placeholder="Pick a country"
				value={value || undefined}
				items={STATE_COUNTRY_OPTIONS}
				onChange={onChange}
			/>
		</ConfigField>
	);
}

export default StatesOfField;

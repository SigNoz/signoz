import type { DashboardtypesPrecisionOptionDTO } from 'api/generated/services/sigNoz.schemas';
import { resolveDecimalPrecision } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/resolvers';
import { formatPanelValue } from 'pages/DashboardPage/DashboardContainer/Panels/utils/formatPanelValue';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import type { FieldResetProps } from '../../utils/changes';
import {
	DECIMAL_OPTIONS,
	DECIMALS_PREVIEW_VALUE,
	DEFAULT_DECIMAL_PRECISION,
} from './options';

import styles from './FormattingSection.module.scss';

interface DecimalsFieldProps extends FieldResetProps {
	value: DashboardtypesPrecisionOptionDTO | undefined;
	unit?: string;
	onChange: (next: DashboardtypesPrecisionOptionDTO) => void;
}

function DecimalsField({
	value = DEFAULT_DECIMAL_PRECISION,
	unit,
	changed,
	onReset,
	onChange,
}: DecimalsFieldProps): JSX.Element {
	return (
		<ConfigField label="Decimal places" changed={changed} onReset={onReset}>
			<ConfigTiles
				compact
				testId="panel-editor-v2-decimals"
				aria-label="Decimal places"
				value={value}
				items={DECIMAL_OPTIONS}
				onChange={onChange}
			/>
			<div className={styles.preview}>
				<span className={styles.previewLabel}>Shows as</span>
				<span className={styles.previewValue} data-testid="decimals-preview">
					{formatPanelValue(
						DECIMALS_PREVIEW_VALUE,
						unit,
						resolveDecimalPrecision(value),
					)}
				</span>
			</div>
		</ConfigField>
	);
}

export default DecimalsField;

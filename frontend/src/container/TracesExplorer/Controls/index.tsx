import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from '@signozhq/icons';
import FieldsSelector from 'components/FieldsSelector';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import { DataSource } from 'types/common/queryBuilder';

import styles from './Controls.module.scss';

function TraceExplorerControls({
	config,
}: TraceExplorerControlsProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);
	const [isFieldsSelectorOpen, setIsFieldsSelectorOpen] = useState(false);

	if (!config?.fieldsSelector) {
		return null;
	}

	return (
		<div className={styles.container}>
			<div
				className={styles.optionsTrigger}
				onClick={(): void => setIsFieldsSelectorOpen(true)}
			>
				{t('options_menu.options')}
				<Settings size="md" />
			</div>
			<FieldsSelector
				isOpen={isFieldsSelectorOpen}
				title="Edit columns"
				fields={config.fieldsSelector.value}
				onFieldsChange={config.fieldsSelector.onFieldsChange}
				onClose={(): void => setIsFieldsSelectorOpen(false)}
				signal={DataSource.TRACES}
			/>
		</div>
	);
}

TraceExplorerControls.defaultProps = {
	config: null,
};

type TraceExplorerControlsProps = {
	config?: OptionsMenuConfig | null;
};

export default memo(TraceExplorerControls);

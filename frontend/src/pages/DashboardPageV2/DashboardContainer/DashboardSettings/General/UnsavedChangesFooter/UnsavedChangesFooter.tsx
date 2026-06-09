import { useTranslation } from 'react-i18next';
import { Button } from '@signozhq/ui/button';
import { Check, X } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from '../GeneralSettings.module.scss';

interface UnsavedChangesFooterProps {
	count: number;
	isSaving: boolean;
	onDiscard: () => void;
	onSave: () => void;
}

function UnsavedChangesFooter({
	count,
	isSaving,
	onDiscard,
	onSave,
}: UnsavedChangesFooterProps): JSX.Element {
	const { t } = useTranslation('common');

	return (
		<div className={styles.overviewSettingsFooter}>
			<div className={styles.unsaved}>
				<div className={styles.unsavedDot} />
				<Typography.Text className={styles.unsavedChanges}>
					{count} unsaved change
					{count > 1 && 's'}
				</Typography.Text>
			</div>
			<div className={styles.footerActionBtns}>
				<Button
					variant="ghost"
					disabled={isSaving}
					prefix={<X size={14} />}
					onClick={onDiscard}
					className={styles.discardBtn}
				>
					Discard
				</Button>
				<Button
					variant="solid"
					color="primary"
					disabled={isSaving}
					loading={isSaving}
					prefix={<Check size={14} />}
					testId="save-dashboard-config"
					onClick={onSave}
					className={styles.saveBtn}
				>
					{t('save')}
				</Button>
			</div>
		</div>
	);
}

export default UnsavedChangesFooter;

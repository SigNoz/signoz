import { useTranslation } from 'react-i18next';
import { Button } from '@signozhq/ui/button';
import { Check, X } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';

import styles from './UnsavedChangesFooter.module.scss';

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
			<div className={styles.footerActionButtons}>
				<Button
					variant="ghost"
					color="secondary"
					disabled={isSaving}
					prefix={<X size={14} />}
					onClick={onDiscard}
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
				>
					{t('save')}
				</Button>
			</div>
		</div>
	);
}

export default UnsavedChangesFooter;

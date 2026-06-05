import { X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';

import styles from './Header.module.scss';

interface HeaderProps {
	isDirty: boolean;
	isSaving: boolean;
	onSave: () => void;
	onClose: () => void;
}

function Header({
	isDirty,
	isSaving,
	onSave,
	onClose,
}: HeaderProps): JSX.Element {
	return (
		<div className={styles.header}>
			<div className={styles.title}>
				<Button
					variant="ghost"
					color="secondary"
					size="icon"
					suffix={<X size={14} />}
					data-testid="panel-editor-v2-close"
					onClick={onClose}
				/>
				<Divider type="vertical" />
				<Typography.Text>Configure panel</Typography.Text>
			</div>
			<div className={styles.actions}>
				<Button
					variant="solid"
					color="primary"
					data-testid="panel-editor-v2-save"
					disabled={!isDirty || isSaving}
					loading={isSaving}
					onClick={onSave}
				>
					Save changes
				</Button>
			</div>
		</div>
	);
}

export default Header;

import { type ReactNode, useState } from 'react';
import { ChevronDown } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './SettingsSection.module.scss';

interface SettingsSectionProps {
	title: string;
	icon?: ReactNode;
	defaultOpen?: boolean;
	children: ReactNode;
}

/**
 * Collapsible container for one configuration section in the V2 panel editor's
 * ConfigPane. Header shows an icon tile (accented when expanded), the title, and a
 * rotating chevron; sections are separated by hairline dividers (no surrounding boxes),
 * matching the Configure-panel design.
 */
function SettingsSection({
	title,
	icon,
	defaultOpen = false,
	children,
}: SettingsSectionProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<section className={styles.section}>
			<button
				type="button"
				className={styles.header}
				aria-expanded={isOpen}
				data-testid={`config-section-${title}`}
				onClick={(): void => setIsOpen((prev) => !prev)}
			>
				{icon && (
					<span className={cx(styles.iconTile, { [styles.iconTileOpen]: isOpen })}>
						{icon}
					</span>
				)}
				<Typography.Text className={styles.title}>{title}</Typography.Text>
				<ChevronDown
					size={15}
					className={cx(styles.chevron, { [styles.open]: isOpen })}
				/>
			</button>
			{isOpen && <div className={styles.body}>{children}</div>}
		</section>
	);
}

export default SettingsSection;

import { type ReactNode, useState } from 'react';
import { ChevronDown } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './SettingsSection.module.scss';

interface SettingsSectionProps {
	title: string;
	icon?: ReactNode;
	defaultOpen?: boolean;
	/** Controlled open state; when set, the section defers to `onOpenChange`. */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Rendered between the title and the chevron. */
	headerSlot?: ReactNode;
	children: ReactNode;
}

/**
 * Collapsible container for one configuration section in the V2 panel editor's ConfigPane.
 */
function SettingsSection({
	title,
	icon,
	defaultOpen = false,
	open,
	onOpenChange,
	headerSlot,
	children,
}: SettingsSectionProps): JSX.Element {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const isControlled = open !== undefined;
	const isOpen = isControlled ? open : internalOpen;

	const toggle = (): void => {
		const next = !isOpen;
		if (!isControlled) {
			setInternalOpen(next);
		}
		onOpenChange?.(next);
	};

	const serializedTitle = title.toLowerCase().replace(/\s+/g, '-');

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<button
					type="button"
					className={styles.toggle}
					aria-expanded={isOpen}
					data-testid={`config-section-${serializedTitle}`}
					onClick={toggle}
				>
					{icon && (
						<span className={cx(styles.iconTile, { [styles.iconTileOpen]: isOpen })}>
							{icon}
						</span>
					)}
					<Typography.Text className={styles.title}>{title}</Typography.Text>
				</button>
				{headerSlot}
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					prefix={
						<ChevronDown
							size={15}
							className={cx(styles.chevron, { [styles.open]: isOpen })}
						/>
					}
					aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
					tabIndex={-1}
					onClick={toggle}
				/>
			</div>
			{isOpen && <div className={styles.body}>{children}</div>}
		</section>
	);
}

export default SettingsSection;

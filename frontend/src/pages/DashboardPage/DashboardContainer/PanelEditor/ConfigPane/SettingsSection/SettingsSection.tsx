import { type ReactNode, useState } from 'react';
import { ChevronDown } from '@signozhq/icons';
import cx from 'classnames';

import ChangedDot from '../controls/ChangedDot/ChangedDot';

import styles from './SettingsSection.module.scss';

interface SettingsSectionProps {
	title: string;
	defaultOpen?: boolean;
	/** Controlled open state; when set, the section defers to `onOpenChange`. */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** One-line digest of the section's values, shown while collapsed. */
	summary?: string;
	changed?: boolean;
	/** Rendered between the title and the chevron. */
	headerSlot?: ReactNode;
	children: ReactNode;
}

/**
 * Collapsible container for one configuration section in the V2 panel editor's ConfigPane.
 */
function SettingsSection({
	title,
	defaultOpen = false,
	open,
	onOpenChange,
	summary,
	changed,
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
					aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
					data-testid={`config-section-${serializedTitle}`}
					onClick={toggle}
				>
					<span className={styles.title}>{title}</span>
					{changed && <ChangedDot title="Has changed settings" />}
					<span className={styles.summary}>{isOpen ? '' : summary}</span>
				</button>
				{headerSlot}
				<ChevronDown
					size={14}
					className={cx(styles.chevron, { [styles.open]: isOpen })}
					onClick={toggle}
				/>
			</div>
			{isOpen && <div className={styles.body}>{children}</div>}
		</section>
	);
}

export default SettingsSection;

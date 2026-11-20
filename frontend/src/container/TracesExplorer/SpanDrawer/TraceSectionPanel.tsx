import { ReactNode } from 'react';
import { Tooltip } from '@signozhq/ui/tooltip';
import { ChevronDown, ChevronUp } from '@signozhq/icons';
import cx from 'classnames';

import styles from './SpanDrawerTraceSection.module.scss';

type TraceSectionPanelProps = {
	icon: ReactNode;
	title: string;
	meta?: ReactNode;
	isOpen: boolean;
	onToggle: () => void;
	testId: string;
	/** Set when the section can't be opened; shown on hover. */
	disabledTooltip?: string;
	/** Mounted only while open. */
	children: ReactNode;
};

function TraceSectionPanel({
	icon,
	title,
	meta,
	isOpen,
	onToggle,
	testId,
	disabledTooltip,
	children,
}: TraceSectionPanelProps): JSX.Element {
	const isDisabled = !!disabledTooltip;
	const header = (
		<button
			type="button"
			className={cx(styles.panelHeader, { [styles.disabled]: isDisabled })}
			onClick={isDisabled ? undefined : onToggle}
			aria-expanded={isOpen}
			aria-disabled={isDisabled}
			data-testid={testId}
		>
			<span className={styles.panelTitle}>
				{icon}
				{title}
			</span>
			{meta && <span className={styles.panelMeta}>{meta}</span>}
			<span className={styles.chevron}>
				{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
			</span>
		</button>
	);

	return (
		<section className={styles.panel}>
			{isDisabled ? <Tooltip title={disabledTooltip}>{header}</Tooltip> : header}
			{isOpen && <div className={styles.panelBody}>{children}</div>}
		</section>
	);
}

export default TraceSectionPanel;

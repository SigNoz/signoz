import { Typography } from '@signozhq/ui/typography';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import styles from './CheckboxFilterV2Header.module.scss';

interface CheckboxFilterHeaderProps {
	title: string;
	isOpen: boolean;
	showClearAll: boolean;
	onToggleOpen: () => void;
	onClear: () => void;
	isSomeFilterPresentForCurrentAttribute: boolean;
}

export function CheckboxFilterV2Header({
	title,
	isOpen,
	showClearAll,
	onToggleOpen,
	onClear,
	isSomeFilterPresentForCurrentAttribute,
}: CheckboxFilterHeaderProps): JSX.Element {
	return (
		<section
			role="button"
			tabIndex={0}
			className={styles.header}
			onClick={onToggleOpen}
			onKeyDown={(e): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					onToggleOpen();
				}
			}}
			data-testid="checkbox-filter-header"
			data-state={isOpen ? 'open' : 'closed'}
		>
			<section className={styles.leftAction}>
				{isOpen ? (
					<ChevronDown size={13} cursor="pointer" />
				) : (
					<ChevronRight size={13} cursor="pointer" />
				)}
				<Typography.Text className={styles.title}>{title}</Typography.Text>
			</section>
			<section className={styles.rightAction}>
				{isOpen && showClearAll && isSomeFilterPresentForCurrentAttribute && (
					<Typography.Text
						className={styles.clearAll}
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							onClear();
						}}
						data-testid="checkbox-filter-clear-all"
					>
						Clear
					</Typography.Text>
				)}
			</section>
		</section>
	);
}

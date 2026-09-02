import { Typography } from '@signozhq/ui/typography';
import { ChevronDown, ChevronRight, Search, Undo2 } from '@signozhq/icons';

import { SectionActionButton } from '../../shared/SectionActionButton/SectionActionButton';

import styles from './CheckboxFilterV2Header.module.scss';

interface CheckboxFilterHeaderProps {
	title: string;
	isOpen: boolean;
	onToggleOpen: () => void;
	onToggleSearch: () => void;
	onClear: () => void;
}

export function CheckboxFilterV2Header({
	title,
	isOpen,
	onToggleOpen,
	onToggleSearch,
	onClear,
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
			{isOpen && (
				<section className={styles.rightAction}>
					<SectionActionButton
						icon={<Search size={14} />}
						tooltip="Search"
						onClick={onToggleSearch}
						testId="checkbox-filter-search-toggle"
					/>
					<SectionActionButton
						icon={<Undo2 size={14} />}
						tooltip="Reset"
						onClick={onClear}
						testId="checkbox-filter-clear-all"
					/>
				</section>
			)}
		</section>
	);
}

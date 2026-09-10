import { useState } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { ChevronDown, ChevronRight, Search, Undo2 } from '@signozhq/icons';

import { SectionActionButton } from '../../shared/SectionActionButton/SectionActionButton';

import classNames from 'classnames';

import styles from './CheckboxFilterV2Header.module.scss';

interface CheckboxFilterHeaderProps {
	title: string;
	isOpen: boolean;
	actionsClassName?: string;
	resetActionClassName?: string;
	onToggleOpen: () => void;
	onToggleSearch: () => void;
	onClear: () => void;
}

export function CheckboxFilterV2Header({
	title,
	isOpen,
	actionsClassName,
	resetActionClassName,
	onToggleOpen,
	onToggleSearch,
	onClear,
}: CheckboxFilterHeaderProps): JSX.Element {
	const [isTitleTruncated, setIsTitleTruncated] = useState(false);

	const measureTitle = (el: HTMLElement | null): void => {
		if (el) {
			setIsTitleTruncated(el.scrollWidth > el.clientWidth);
		}
	};

	const titleText = (
		<Typography.Text ref={measureTitle} className={styles.title}>
			{title}
		</Typography.Text>
	);

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
				{isTitleTruncated ? (
					<TooltipSimple title={title} delayDuration={400}>
						{titleText}
					</TooltipSimple>
				) : (
					titleText
				)}
			</section>
			{isOpen && (
				<section className={classNames(styles.rightAction, actionsClassName)}>
					<SectionActionButton
						icon={<Undo2 size={14} />}
						className={resetActionClassName}
						tooltip="Reset"
						onClick={onClear}
						testId="checkbox-filter-clear-all"
					/>
					<SectionActionButton
						icon={<Search size={14} />}
						tooltip="Search"
						onClick={onToggleSearch}
						testId="checkbox-filter-search-toggle"
					/>
				</section>
			)}
		</section>
	);
}

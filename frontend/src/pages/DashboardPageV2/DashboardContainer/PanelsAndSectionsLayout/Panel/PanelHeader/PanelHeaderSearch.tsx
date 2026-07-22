import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Input } from '@signozhq/ui/input';
import { Search, X } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import styles from './PanelHeaderSearch.module.scss';
import { Button } from '@signozhq/ui/button';

interface PanelHeaderSearchProps {
	/** Current filter term, owned by the panel shell. */
	value: string;
	/** Pushes the new term up; the renderer applies the filter. */
	onChange: (value: string) => void;
}

/**
 * Collapsible header search (V1 parity): an icon that expands into an input and
 * collapses once empty and blurred. Owns only its chrome, never the term.
 */
function PanelHeaderSearch({
	value,
	onChange,
}: PanelHeaderSearchProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);

	const collapseIfEmpty = (): void => {
		if (!value) {
			setExpanded(false);
		}
	};

	const clear = (): void => {
		onChange('');
		setExpanded(false);
	};

	const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
		onChange(e.target.value);
		void logEvent(DashboardDetailEvents.PanelSearched, {}, 'track', true);
	};

	if (!expanded) {
		return (
			<TooltipSimple title="Search" arrow>
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					onClick={(): void => setExpanded(true)}
					className={styles.searchTrigger}
					data-testid="panel-header-search-trigger"
					aria-label="Search"
				>
					<Search size={14} />
				</Button>
			</TooltipSimple>
		);
	}

	return (
		<Input
			autoFocus
			size={14}
			value={value}
			placeholder="Search…"
			containerClassName={styles.input}
			testId="panel-header-search-input"
			prefix={<Search size={14} />}
			suffix={
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					className={styles.clear}
					onClick={clear}
					data-testid="panel-header-search-clear"
					aria-label="Clear search"
				>
					<X size={14} />
				</Button>
			}
			onChange={handleSearchChange}
			onBlur={collapseIfEmpty}
			onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
				if (e.key === 'Escape') {
					clear();
				}
			}}
		/>
	);
}

export default PanelHeaderSearch;

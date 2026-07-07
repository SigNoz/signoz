import { useState } from 'react';
import { ChevronLeft } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { useInlineOverflowCount } from 'hooks/useInlineOverflowCount';

import type { VariableSelection } from './selectionTypes';
import { useVariableSelection } from './useVariableSelection';
import VariableSelector from './VariableSelector';
import styles from './VariablesBar.module.scss';

// Short display of a variable's current selection, for the collapsed +N tooltip.
function formatSelection(selection: VariableSelection | undefined): string {
	if (!selection) {
		return '—';
	}
	if (selection.allSelected) {
		return 'ALL';
	}
	const { value } = selection;
	if (Array.isArray(value)) {
		return value.length > 0 ? value.join(', ') : '—';
	}
	return value === '' || value === null || value === undefined
		? '—'
		: String(value);
}

interface VariablesBarProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

/**
 * Runtime variable selector bar shown above the panels. Renders one control per
 * dashboard variable; selections live in the store + URL (never the spec).
 *
 * The pills sit on the line left of the floated time selector and collapse the
 * overflow behind a `+N` trigger. Expanding lets the bar wrap onto full-width
 * lines that flow underneath the time selector. Every selector stays mounted
 * either way so auto-selection and option fetching keep driving the panels.
 */
function VariablesBar({ dashboard }: VariablesBarProps): JSX.Element | null {
	const { variables, selection, setSelection } = useVariableSelection(dashboard);
	const [expanded, setExpanded] = useState(false);
	const { containerRef, visibleCount, overflowCount } = useInlineOverflowCount({
		itemCount: variables.length,
		gap: 8,
		reserveWidth: 48,
		enabled: !expanded,
	});

	if (variables.length === 0) {
		return null;
	}

	const hasOverflow = overflowCount > 0;
	const hiddenVariables =
		!expanded && hasOverflow ? variables.slice(visibleCount) : [];

	const moreButton = (
		<Button
			variant="outlined"
			color="secondary"
			size="md"
			prefix={expanded ? <ChevronLeft size={14} /> : undefined}
			aria-expanded={expanded}
			testId="dashboard-variables-more"
			onClick={(): void => setExpanded((prev) => !prev)}
		>
			{expanded ? 'Less' : `+${overflowCount}`}
		</Button>
	);

	return (
		<div className={styles.bar} data-testid="dashboard-variables-bar">
			<div
				ref={containerRef}
				className={cx(styles.strip, { [styles.stripExpanded]: expanded })}
			>
				{variables.map((variable, index) => (
					<div
						key={variable.name}
						data-overflow-item="true"
						className={cx(styles.variableSlot, {
							[styles.variableSlotHidden]:
								!expanded && hasOverflow && index >= visibleCount,
						})}
					>
						<VariableSelector
							variable={variable}
							variables={variables}
							selections={selection}
							selection={
								selection[variable.name] ?? {
									value: variable.multiSelect ? [] : '',
									allSelected: false,
								}
							}
							onChange={(next): void => setSelection(variable.name, next)}
						/>
					</div>
				))}

				{hasOverflow && (
					<span className={styles.moreButton}>
						{expanded ? (
							moreButton
						) : (
							<TooltipSimple
								side="top"
								title={
									<div className={styles.overflowTooltip}>
										{hiddenVariables.map((variable) => (
											<div key={variable.name}>
												<span className={styles.overflowName}>{variable.name}</span>:{' '}
												{formatSelection(selection[variable.name])}
											</div>
										))}
									</div>
								}
							>
								{moreButton}
							</TooltipSimple>
						)}
					</span>
				)}
			</div>
		</div>
	);
}

export default VariablesBar;

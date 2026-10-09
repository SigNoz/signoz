import type { ReactNode } from 'react';
import cx from 'classnames';
import { Pin } from '@signozhq/icons';

import Styles from './TooltipCard.module.scss';

export interface TooltipCardRow {
	key: string;
	label: string;
	value: string;
}

interface TooltipCardProps {
	title: string;
	/** The marker beside the title, matching the item's mark on the chart. */
	color: string;
	/** What the item says. */
	rows: TooltipCardRow[];
	/** What names the item, below the rows and muted. */
	mutedRows?: TooltipCardRow[];
	isPinned?: boolean;
	footer?: ReactNode;
	/** Prefixes the test ids of the title, status, rows and muted rows. */
	testId: string;
}

/** One item's tooltip: a marked title, then label/value rows, on the shared tooltip surface. */
export default function TooltipCard({
	title,
	color,
	rows,
	mutedRows = [],
	isPinned = false,
	footer,
	testId,
}: TooltipCardProps): JSX.Element {
	return (
		<div
			className={cx(Styles.container, { [Styles.pinned]: isPinned })}
			data-pinned={isPinned}
			data-testid={testId}
		>
			<div className={Styles.header}>
				<span
					className={Styles.marker}
					style={{ backgroundColor: color, borderColor: color }}
				/>
				<span
					className={Styles.title}
					title={title}
					data-testid={`${testId}-title`}
				>
					{title}
				</span>
				{isPinned && (
					<span className={Styles.status} data-testid={`${testId}-status`}>
						<Pin size={12} />
						<span>Pinned</span>
					</span>
				)}
			</div>

			<span className={Styles.divider} />

			<div className={Styles.rows}>
				{rows.map((row) => (
					<div key={row.key} className={Styles.row} data-testid={`${testId}-row`}>
						<span className={Styles.rowLabel}>{row.label}</span>
						<span className={Styles.rowValue}>{row.value}</span>
					</div>
				))}
			</div>

			{mutedRows.length > 0 && (
				<>
					<span className={Styles.divider} />
					<div className={Styles.rows}>
						{mutedRows.map((row) => (
							<div
								key={row.key}
								className={cx(Styles.row, Styles.rowMuted)}
								data-testid={`${testId}-label`}
							>
								<span className={Styles.rowLabel} title={row.label}>
									{row.label}
								</span>
								<span className={Styles.rowValue} title={row.value}>
									{row.value}
								</span>
							</div>
						))}
					</div>
				</>
			)}

			{footer}
		</div>
	);
}

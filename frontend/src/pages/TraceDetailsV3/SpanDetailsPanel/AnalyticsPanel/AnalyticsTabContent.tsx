import { Fragment } from 'react';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import Spinner from 'components/Spinner';

import styles from './AnalyticsPanel.module.scss';

export interface AnalyticsRow {
	group: string;
	color: string;
	widthPct: number;
	label: string;
}

interface AnalyticsTabContentProps {
	isLoading: boolean;
	isError: boolean;
	fieldName: string;
	rows: AnalyticsRow[];
	valueVariant: 'wide' | 'narrow';
}

// Loading / error / empty render in place of the rows so the tabs stay visible.
function AnalyticsTabContent({
	isLoading,
	isError,
	fieldName,
	rows,
	valueVariant,
}: AnalyticsTabContentProps): JSX.Element {
	if (isLoading) {
		return (
			<div className={styles.state}>
				<Spinner height="auto" />
			</div>
		);
	}
	if (isError) {
		return (
			<div className={styles.state}>
				<Typography.Text>Couldn&apos;t load analytics</Typography.Text>
			</div>
		);
	}
	if (rows.length === 0) {
		return (
			<div className={styles.state}>
				<Typography.Text>No data for {fieldName}</Typography.Text>
			</div>
		);
	}

	return (
		<div className={styles.list}>
			{rows.map((row) => (
				<Fragment key={row.group}>
					<div className={styles.dot} style={{ backgroundColor: row.color }} />
					<span className={styles.serviceName}>{row.group}</span>
					<div className={styles.barCell}>
						<div className={styles.bar}>
							<div
								className={styles.barFill}
								style={{
									width: `${row.widthPct}%`,
									backgroundColor: row.color,
								}}
							/>
						</div>
						<span
							className={cx(
								styles.value,
								valueVariant === 'wide' ? styles.valueWide : styles.valueNarrow,
							)}
						>
							{row.label}
						</span>
					</div>
				</Fragment>
			))}
		</div>
	);
}

export default AnalyticsTabContent;

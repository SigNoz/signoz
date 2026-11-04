import { Tooltip } from '@signozhq/ui/tooltip';

import HeaderTooltip from './HeaderTooltip';

import styles from './TopListHeader.module.scss';

interface TopListHeaderProps {
	valueName: string;
	/** The group-by keys behind each label; empty when the query has no group-by. */
	labelName: string;
	showRank: boolean;
	showShare: boolean;
}

function TopListHeader({
	valueName,
	labelName,
	showRank,
	showShare,
}: TopListHeaderProps): JSX.Element {
	return (
		<li aria-hidden data-testid="top-list-header" className={styles.header}>
			{showRank && (
				<Tooltip
					title={<HeaderTooltip name="Rank" description="Position in the list." />}
				>
					<span className={styles.cell}>#</span>
				</Tooltip>
			)}
			{labelName ? (
				<Tooltip
					title={
						<HeaderTooltip
							name={labelName}
							description="The group each row stands for."
						/>
					}
					align="start"
				>
					<span className={styles.label}>{labelName}</span>
				</Tooltip>
			) : (
				<span />
			)}
			{showShare && (
				<Tooltip
					title={
						<HeaderTooltip
							name="Share"
							description="Each row's value as a percentage of the listed rows' total."
						/>
					}
				>
					<span className={styles.cell}>Share</span>
				</Tooltip>
			)}
			<Tooltip
				title={
					<HeaderTooltip
						name={valueName}
						description="The value each row is ranked by."
					/>
				}
				align="end"
			>
				<span className={styles.cell}>{valueName}</span>
			</Tooltip>
		</li>
	);
}

export default TopListHeader;

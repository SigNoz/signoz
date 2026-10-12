import { TooltipSimple } from '@signozhq/ui/tooltip';

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
				<TooltipSimple
					title={<HeaderTooltip name="Rank" description="Position in the list." />}
					arrow
				>
					<span className={styles.cell}>#</span>
				</TooltipSimple>
			)}
			{labelName ? (
				<TooltipSimple
					title={
						<HeaderTooltip
							name={labelName}
							description="The group each row stands for."
						/>
					}
					align="start"
					arrow
				>
					<span className={styles.label}>{labelName}</span>
				</TooltipSimple>
			) : (
				<span />
			)}
			{showShare && (
				<TooltipSimple
					title={
						<HeaderTooltip
							name="Share"
							description="Each row's value as a percentage of the listed rows' total."
						/>
					}
					arrow
				>
					<span className={styles.cell}>Share</span>
				</TooltipSimple>
			)}
			<TooltipSimple
				title={
					<HeaderTooltip
						name={valueName}
						description="The value each row is ranked by."
					/>
				}
				align="end"
				arrow
			>
				<span className={styles.cell}>{valueName}</span>
			</TooltipSimple>
		</li>
	);
}

export default TopListHeader;

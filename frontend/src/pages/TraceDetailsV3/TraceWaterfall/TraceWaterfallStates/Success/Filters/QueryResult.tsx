import { ChevronDown, ChevronUp, Info, Loader } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { AxiosError } from 'axios';
import cx from 'classnames';

import styles from './QueryResult.module.scss';

type QueryResultProps = {
	hasExpression: boolean;
	hasResults: boolean;
	isFetching: boolean;
	error: unknown;
	noData: boolean;
	currentIndex: number;
	total: number;
	onPrev: () => void;
	onNext: () => void;
	showNavigation?: boolean;
};

function QueryResult({
	hasExpression,
	hasResults,
	isFetching,
	error,
	noData,
	currentIndex,
	total,
	onPrev,
	onNext,
	showNavigation = true,
}: QueryResultProps): JSX.Element | null {
	if (!hasExpression) {
		return null;
	}

	let content: JSX.Element | null = null;
	if (hasResults && showNavigation) {
		// Prefer count over loader on refresh so stale results stay visible.
		content = (
			<>
				<Typography.Text className={styles.resultNavCount}>
					{currentIndex + 1} / {total}
				</Typography.Text>
				<Button
					aria-label="Action"
					disabledTooltip="This is the first result"
					variant="ghost"
					size="sm"
					icon
					color="secondary"
					disabled={currentIndex === 0}
					onClick={onPrev}
				>
					<ChevronUp size={14} />
				</Button>
				<Button
					aria-label="Action"
					disabledTooltip="This is the last result"
					variant="ghost"
					size="sm"
					icon
					color="secondary"
					disabled={currentIndex === total - 1}
					onClick={onNext}
				>
					<ChevronDown size={14} />
				</Button>
			</>
		);
	} else if (isFetching) {
		content = <Loader className="animate-spin" />;
	} else if (error) {
		content = (
			<Tooltip title={(error as AxiosError)?.message || 'Something went wrong'}>
				<span className={cx(styles.filterStatus, styles.hasError)}>
					<Info />
					API error
				</span>
			</Tooltip>
		);
	} else if (noData) {
		content = (
			<Typography.Text className={styles.filterStatus}>
				No results found
			</Typography.Text>
		);
	}

	if (!content) {
		return null;
	}

	return (
		<>
			{content}
			{showNavigation && <span className={styles.resultNavDivider} />}
		</>
	);
}

QueryResult.defaultProps = {
	showNavigation: true,
};

export default QueryResult;

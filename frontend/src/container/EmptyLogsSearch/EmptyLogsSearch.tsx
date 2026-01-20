import './EmptyLogsSearch.styles.scss';

import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import LearnMore from 'components/LearnMore/LearnMore';
import { EmptyLogsListConfig } from 'container/LogsExplorerList/utils';
import { Delete } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { DataSource, PanelTypeKeys } from 'types/common/queryBuilder';

interface EmptyLogsSearchProps {
	dataSource: DataSource;
	panelType: PanelTypeKeys;
	customMessage?: EmptyLogsListConfig;
}

export default function EmptyLogsSearch({
	dataSource,
	panelType,
	customMessage,
}: EmptyLogsSearchProps): JSX.Element {
	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current) {
			if (dataSource === DataSource.TRACES) {
				logEvent('Traces Explorer: No results', {
					panelType,
				});
			} else if (dataSource === DataSource.LOGS) {
				logEvent('Logs Explorer: No results', {
					panelType,
				});
			}
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			className={cx('empty-logs-search__container', {
				'empty-logs-search__container--custom-message': !!customMessage,
			})}
		>
			<div className="empty-logs-search__row">
				<div className="empty-logs-search__content">
					<img
						src="/Icons/emptyState.svg"
						alt="thinking-emoji"
						className="empty-state-svg"
					/>
					{customMessage ? (
						<>
							<div className="empty-logs-search__header">
								<Typography.Text className="empty-logs-search__title">
									{customMessage.title}
								</Typography.Text>
								{customMessage.subTitle && (
									<Typography.Text className="empty-logs-search__subtitle">
										{customMessage.subTitle}
									</Typography.Text>
								)}
							</div>
							{Array.isArray(customMessage.description) ? (
								<ul className="empty-logs-search__description-list">
									{customMessage.description.map((desc) => (
										<li key={desc}>{desc}</li>
									))}
								</ul>
							) : (
								<Typography.Text className="empty-logs-search__description">
									{customMessage.description}
								</Typography.Text>
							)}
							{/* Clear filters button */}
							{customMessage.showClearFiltersButton && (
								<button
									type="button"
									className="empty-logs-search__clear-filters-btn"
									onClick={customMessage.onClearFilters}
								>
									{customMessage.clearFiltersButtonText}
									<span className="empty-logs-search__clear-filters-btn-icon">
										<Delete size={14} />
										Clear filters
									</span>
								</button>
							)}
						</>
					) : (
						<Typography.Text>
							<span className="empty-logs-search__sub-text">
								This query had no results.{' '}
							</span>
							Edit your query and try again!
						</Typography.Text>
					)}
				</div>
				{customMessage?.documentationLinks && (
					<div className="empty-logs-search__resources-card">
						<div className="empty-logs-search__resources-title">RESOURCES</div>
						<div className="empty-logs-search__resources-links">
							{customMessage.documentationLinks.map((link) => (
								<LearnMore key={link.text} text={link.text} url={link.url} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

EmptyLogsSearch.defaultProps = {
	customMessage: null,
};

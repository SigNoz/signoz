import './EmptyLogsSearch.styles.scss';

import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import LearnMore from 'components/LearnMore/LearnMore';
import { useEffect, useRef } from 'react';
import { DataSource, PanelTypeKeys } from 'types/common/queryBuilder';

interface EmptyLogsSearchProps {
	dataSource: DataSource;
	panelType: PanelTypeKeys;
	customMessage?: {
		title: string;
		description: string;
		documentationLinks?: Array<{
			text: string;
			url: string;
			description?: string;
		}>;
	};
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

	const handleDocumentationClick = (url: string, text: string): void => {
		logEvent('Logs Explorer: Documentation link clicked', {
			panelType,
			linkText: text,
			linkUrl: url,
		});
		window.open(url, '_blank');
	};

	return (
		<div
			className={cx('empty-logs-search-container', {
				'custom-message': !!customMessage,
			})}
		>
			<div className="empty-logs-search-container-content">
				<img
					src="/Icons/emptyState.svg"
					alt="thinking-emoji"
					className="empty-state-svg"
				/>
				{customMessage ? (
					<>
						<Typography.Text className="custom-title">
							{customMessage.title}
						</Typography.Text>
						<Typography.Text className="custom-description">
							{customMessage.description}
						</Typography.Text>
						{customMessage.documentationLinks && (
							<div className="documentation-links">
								{customMessage.documentationLinks.map((link) => (
									<LearnMore
										key={link.text}
										text={link.text}
										url={link.url}
										onClick={(): void => handleDocumentationClick(link.url, link.text)}
									/>
								))}
							</div>
						)}
					</>
				) : (
					<Typography.Text>
						<span className="sub-text">This query had no results. </span>
						Edit your query and try again!
					</Typography.Text>
				)}
			</div>
		</div>
	);
}

EmptyLogsSearch.defaultProps = {
	customMessage: null,
};

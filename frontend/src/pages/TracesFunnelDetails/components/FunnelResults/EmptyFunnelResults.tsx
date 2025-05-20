import './EmptyFunnelResults.styles.scss';

import LearnMore from 'components/LearnMore/LearnMore';

function EmptyFunnelResults({
	title,
	description,
}: {
	title?: string;
	description?: string;
}): JSX.Element {
	return (
		<div className="funnel-results funnel-results--empty">
			<div className="empty-funnel-results">
				<div className="empty-funnel-results__icon">
					<img src="/Icons/empty-funnel-icon.svg" alt="Empty funnel results" />
				</div>
				<div className="empty-funnel-results__title">{title}</div>
				<div className="empty-funnel-results__description">{description}</div>
				<div className="empty-funnel-results__learn-more">
					<LearnMore url="https://signoz.io/blog/tracing-funnels-observability-distributed-systems/" />
				</div>
			</div>
		</div>
	);
}

EmptyFunnelResults.defaultProps = {
	title: 'No spans selected yet.',
	description: 'Add spans to the funnel steps to start seeing analytics here.',
};

export default EmptyFunnelResults;

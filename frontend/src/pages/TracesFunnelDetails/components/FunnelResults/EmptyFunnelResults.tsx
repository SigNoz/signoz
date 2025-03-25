import './EmptyFunnelResults.styles.scss';

import LearnMore from 'components/LearnMore/LearnMore';

function EmptyFunnelResults(): JSX.Element {
	return (
		<div className="funnel-results funnel-results--empty">
			<div className="empty-funnel-results">
				<div className="empty-funnel-results__icon">
					<img src="/Icons/empty-funnel-icon.svg" alt="Empty funnel results" />
				</div>
				<div className="empty-funnel-results__title">No spans selected yet.</div>
				<div className="empty-funnel-results__description">
					Add spans to the funnel steps to start seeing analytics here.
				</div>
				<div className="empty-funnel-results__learn-more">
					<LearnMore />
				</div>
			</div>
		</div>
	);
}

export default EmptyFunnelResults;

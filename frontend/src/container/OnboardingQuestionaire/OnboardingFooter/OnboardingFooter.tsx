import { Dot } from 'lucide-react';

import './OnboardingFooter.styles.scss';

export function OnboardingFooter(): JSX.Element {
	return (
		<section className="footer-main-container">
			<div className="footer-container">
				<a
					href="https://trust.signoz.io/"
					target="_blank"
					className="footer-content"
					rel="noreferrer"
				>
					{/* hippa.svg does not exist in src/assets — suppressed until asset is added */}
					{/* eslint-disable-next-line signoz/no-unsupported-asset-pattern */}
					<img src="/logos/hippa.svg" alt="HIPPA" className="footer-logo" />
					<span className="footer-text">HIPPA</span>
				</a>
				<Dot size={24} color="#2C3140" />
				<a
					href="https://trust.signoz.io/"
					target="_blank"
					className="footer-content"
					rel="noreferrer"
				>
					{/* soc2.svg does not exist in src/assets — suppressed until asset is added */}
					{/* eslint-disable-next-line signoz/no-unsupported-asset-pattern */}
					<img src="/logos/soc2.svg" alt="SOC2" className="footer-logo" />
					<span className="footer-text">SOC2</span>
				</a>
			</div>
		</section>
	);
}

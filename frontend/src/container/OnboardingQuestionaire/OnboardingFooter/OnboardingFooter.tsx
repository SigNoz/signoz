import './OnboardingFooter.styles.scss';

import { ArrowUpRight, Dot } from 'lucide-react';

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
					<img src="/logos/soc2.svg" alt="SOC2" className="footer-logo" />
					<span className="footer-text">SOC2</span>
				</a>

				<Dot size={24} color="#2C3140" />
				<a
					href="https://signoz.io/privacy/"
					target="_blank"
					className="footer-link"
					rel="noreferrer"
				>
					{' '}
					{/* Please add correct url */}
					<span className="footer-text">Privacy</span> <ArrowUpRight size={14} />
				</a>

				<Dot size={24} color="#2C3140" />
				<a
					href="https://signoz.io/security/"
					target="_blank"
					className="footer-link"
					rel="noreferrer"
				>
					{' '}
					{/* Please add correct url */}
					<span className="footer-text">Security</span> <ArrowUpRight size={14} />
				</a>
			</div>
		</section>
	);
}

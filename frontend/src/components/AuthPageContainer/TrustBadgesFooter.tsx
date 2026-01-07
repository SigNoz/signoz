import './TrustBadgesFooter.styles.scss';

import { ArrowUpRight } from 'lucide-react';
import React from 'react';

interface TrustBadge {
	icon?: string;
	text: string;
	url?: string;
}

const trustBadges: TrustBadge[] = [
	{
		icon: '/svgs/hipaa.svg',
		text: 'HIPAA',
	},
	{
		icon: '/svgs/SOC-2.svg',
		text: 'SOC2',
	},
	{
		text: 'Privacy',
		url: 'https://www.signoz.io/privacy',
	},
	{
		text: 'Security',
		url: 'https://www.signoz.io/security',
	},
];

function TrustBadgesFooter(): JSX.Element {
	return (
		<footer className="trust-badges-footer">
			<div className="trust-badges-footer-content">
				{trustBadges.map((badge, index) => (
					<React.Fragment key={badge.text}>
						<div className="trust-footer-item">
							{badge.icon && (
								<img
									loading="lazy"
									src={badge.icon}
									alt=""
									className="trust-footer-icon"
								/>
							)}
							{badge.url ? (
								<a
									href={badge.url}
									className="trust-footer-link"
									target="_blank"
									rel="noopener noreferrer"
								>
									<span className="trust-footer-text">{badge.text}</span>
									<ArrowUpRight size={12} className="trust-footer-link-icon" />
								</a>
							) : (
								<span className="trust-footer-text">{badge.text}</span>
							)}
						</div>
						{index < trustBadges.length - 1 && (
							<div className="trust-footer-separator" />
						)}
					</React.Fragment>
				))}
			</div>
		</footer>
	);
}

export default TrustBadgesFooter;

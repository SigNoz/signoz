import './CloudIntegrationPage.scss';

import Breadcrumb from 'antd/es/breadcrumb';
import ROUTES from 'constants/routes';
import { Blocks, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';

function Header(): JSX.Element {
	return (
		<div className="cloud-header">
			<div className="cloud-header__navigation">
				<Breadcrumb
					className="cloud-header__breadcrumb"
					items={[
						{
							title: (
								<Link to={ROUTES.INTEGRATIONS}>
									<span className="cloud-header__breadcrumb-link">
										<Blocks size={16} color="var(--bg-vanilla-400)" />
										<span className="cloud-header__breadcrumb-title">Integrations</span>
									</span>
								</Link>
							),
						},
						{
							title: (
								<div className="cloud-header__breadcrumb-title">AWS web services</div>
							),
						},
					]}
				/>
			</div>
			<div className="cloud-header__actions">
				<button className="cloud-header__help" type="button">
					<LifeBuoy size={12} />
					Get Help
				</button>
			</div>
		</div>
	);
}

function HeroSection(): JSX.Element {
	return (
		<div
			className="hero-section"
			style={{
				backgroundImage: `linear-gradient(
					90deg,
					rgba(18, 19, 23, 0.95) 0%,
					rgba(18, 19, 23, 0.8) 50%,
					rgba(18, 19, 23, 0.6) 100%
				),
				url('/Images/integrations-hero-bg.png')`,
			}}
		>
			<div className="hero-section__icon">
				<img src="/Logos/aws-dark.svg" alt="aws-logo" />
			</div>
			<div className="hero-section__details">
				<div className="title">AWS Web Services</div>
				<div className="description">
					One-click setup for AWS monitoring with SigNoz
				</div>
				<div className="hero-section__buttons">
					<button className="hero-section__button" type="button">
						Integrate Now
					</button>
				</div>
			</div>
		</div>
	);
}

function CloudIntegrationPage(): JSX.Element {
	return (
		<div>
			<Header />
			<HeroSection />
		</div>
	);
}

export default CloudIntegrationPage;

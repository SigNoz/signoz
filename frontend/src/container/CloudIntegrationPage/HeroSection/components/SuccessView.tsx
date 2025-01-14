import './SuccessView.style.scss';

import { Alert, Button } from 'antd';
import integrationsSuccess from 'assets/Lotties/integrations-success.json';
import ROUTES from 'constants/routes';
import { useState } from 'react';
import Lottie from 'react-lottie';
import { useNavigate } from 'react-router-dom-v5-compat';

export function SuccessView(): JSX.Element {
	const navigate = useNavigate();
	const [isAnimationComplete, setIsAnimationComplete] = useState(false);

	const defaultOptions = {
		loop: false,
		autoplay: true,
		animationData: integrationsSuccess,
		rendererSettings: {
			preserveAspectRatio: 'xMidYMid slice',
		},
	};

	const handleGoToDashboards = (): void => {
		navigate(ROUTES.ALL_DASHBOARD);
	};

	return (
		<>
			{!isAnimationComplete && (
				<div className="lottie-container">
					<Lottie
						options={defaultOptions}
						height={990.342}
						width={743.5}
						eventListeners={[
							{
								eventName: 'complete',
								callback: (): void => setIsAnimationComplete(true),
							},
						]}
					/>
				</div>
			)}
			<div className="cloud-account-setup-success-view">
				<div className="cloud-account-setup-success-view__icon">
					<img src="Icons/solid-check-circle.svg" alt="Success" />
				</div>
				<div className="cloud-account-setup-success-view__content">
					<div className="cloud-account-setup-success-view__title">
						<h3>🎉 Success! </h3>
						<h3>Your AWS Web Service integration is all set.</h3>
					</div>
					<div className="cloud-account-setup-success-view__description">
						<p>Your observability journey is off to a great start. </p>
						<p>Now that your data is flowing, here’s what you can do next:</p>
					</div>
				</div>
				<div className="cloud-account-setup-success-view__what-next">
					<h4 className="cloud-account-setup-success-view__what-next-title">
						WHAT NEXT
					</h4>
					<div className="what-next-items-wrapper">
						{[
							'Understand your AWS services with SigNoz’s out-of-the-box dashboards',
							'Set up alerts for real-time monitoring.',
							'Track logs and traces.',
						].map((item) => (
							<Alert
								key={item}
								message={
									<div className="what-next-items-wrapper__item">
										<div className="what-next-item-bullet-icon">•</div>
										<div className="what-next-item-text">{item}</div>
									</div>
								}
								type="info"
								className="what-next-items-wrapper__item"
							/>
						))}
					</div>
				</div>
				<div className="cloud-account-setup-success-view__footer">
					<Button type="primary" block onClick={handleGoToDashboards}>
						Go to Dashboards
					</Button>
				</div>
			</div>
		</>
	);
}

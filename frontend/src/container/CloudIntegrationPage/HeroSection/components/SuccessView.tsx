import './SuccessView.style.scss';

import { Alert } from 'antd';
import integrationsSuccess from 'assets/Lotties/integrations-success.json';
import { useState } from 'react';
import Lottie from 'react-lottie';

export function SuccessView(): JSX.Element {
	const [isAnimationComplete, setIsAnimationComplete] = useState(false);

	const defaultOptions = {
		loop: false,
		autoplay: true,
		animationData: integrationsSuccess,
		rendererSettings: {
			preserveAspectRatio: 'xMidYMid slice',
		},
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
						<Alert
							message={
								<div className="what-next-items-wrapper__item">
									<div className="what-next-item-bullet-icon">•</div>
									<div className="what-next-item-text">
										Set up your AWS services effortlessly under your enabled account.
									</div>
								</div>
							}
							type="info"
							className="what-next-items-wrapper__item"
						/>
					</div>
				</div>
			</div>
		</>
	);
}

import { Color } from '@signozhq/design-tokens';
import { Alert, Spin } from 'antd';
import { LoaderCircle, TriangleAlert } from 'lucide-react';

<<<<<<< HEAD:frontend/src/container/CloudIntegrationPage/HeroSection/components/AlertMessage.tsx
import { ModalStateEnum } from '../types';
=======
import { ModalStateEnum } from './types';
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration):frontend/src/pages/Integrations/CloudIntegrationPage/HeroSection/AlertMessage.tsx

function AlertMessage({
	modalState,
}: {
	modalState: ModalStateEnum;
}): JSX.Element | null {
	switch (modalState) {
		case ModalStateEnum.WAITING:
			return (
				<Alert
					message={
<<<<<<< HEAD:frontend/src/container/CloudIntegrationPage/HeroSection/components/AlertMessage.tsx
						<div className="cloud-account-setup-form__alert-message">
=======
						<div className="cloud-integrations-form__alert-message">
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration):frontend/src/pages/Integrations/CloudIntegrationPage/HeroSection/AlertMessage.tsx
							<Spin
								indicator={
									<LoaderCircle
										size={14}
										color={Color.BG_AMBER_400}
										className="anticon anticon-loading anticon-spin ant-spin-dot"
									/>
								}
							/>
							Waiting for connection, retrying in{' '}
							<span className="retry-time">10</span> secs...
						</div>
					}
<<<<<<< HEAD:frontend/src/container/CloudIntegrationPage/HeroSection/components/AlertMessage.tsx
					className="cloud-account-setup-form__alert"
=======
					className="cloud-integrations-form__alert"
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration):frontend/src/pages/Integrations/CloudIntegrationPage/HeroSection/AlertMessage.tsx
					type="warning"
				/>
			);
		case ModalStateEnum.ERROR:
			return (
				<Alert
					message={
<<<<<<< HEAD:frontend/src/container/CloudIntegrationPage/HeroSection/components/AlertMessage.tsx
						<div className="cloud-account-setup-form__alert-message">
							<TriangleAlert type="solid" size={15} color={Color.BG_SAKURA_400} />
							{`We couldn't establish a connection to your AWS account. Please try again`}
						</div>
					}
					type="error"
					className="cloud-account-setup-form__alert"
=======
						<div className="cloud-integrations-form__alert-message">
							<TriangleAlert type="solid" size={15} color={Color.BG_SAKURA_400} />
							We couldn’t establish a connection to your AWS account. Please try again
						</div>
					}
					type="error"
					className="cloud-integrations-form__alert"
>>>>>>> d7c67cfa6 (feat: integrate now modal states and json server API integration):frontend/src/pages/Integrations/CloudIntegrationPage/HeroSection/AlertMessage.tsx
				/>
			);
		default:
			return null;
	}
}

export default AlertMessage;

import { Callout } from '@signozhq/ui';
import { Spin } from 'antd';
import { LoaderCircle } from 'lucide-react';

import { ModalStateEnum } from '../HeroSection/types';

function AlertMessage({
	modalState,
}: {
	modalState: ModalStateEnum;
}): JSX.Element | null {
	switch (modalState) {
		case ModalStateEnum.WAITING:
			return (
				<Callout
					title={
						<div className="cloud-account-setup-form__alert-message">
							<Spin
								indicator={
									<LoaderCircle
										size={14}
										className="anticon anticon-loading anticon-spin ant-spin-dot"
									/>
								}
							/>
							Waiting for connection, retrying in{' '}
							<span className="retry-time">10</span> secs...
						</div>
					}
					type="info"
					showIcon={false}
				/>
			);
		case ModalStateEnum.ERROR:
			return (
				<Callout
					title={
						<div className="cloud-account-setup-form__alert-message">
							{`We couldn't establish a connection to your AWS account. Please try again`}
						</div>
					}
					type="error"
				/>
			);
		default:
			return null;
	}
}

export default AlertMessage;

import { Color } from '@signozhq/design-tokens';
import { Alert, Spin } from 'antd';
import { LoaderCircle, TriangleAlert } from 'lucide-react';

import { ModalStateEnum } from '../types';

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
						<div className="cloud-account-setup-form__alert-message">
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
					className="cloud-account-setup-form__alert"
					type="warning"
				/>
			);
		case ModalStateEnum.ERROR:
			return (
				<Alert
					message={
						<div className="cloud-account-setup-form__alert-message">
							<TriangleAlert type="solid" size={15} color={Color.BG_SAKURA_400} />
							{`We couldn't establish a connection to your AWS account. Please try again`}
						</div>
					}
					type="error"
					className="cloud-account-setup-form__alert"
				/>
			);
		default:
			return null;
	}
}

export default AlertMessage;

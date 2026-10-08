import {
	LoaderCircle,
	SolidAlertCircle,
	SolidInfoCircle,
} from '@signozhq/icons';
import { Callout } from '@signozhq/ui/callout';
import { Spin } from 'antd';

import { ModalStateEnum } from '../HeroSection/types';

function AlertMessage({
	modalState,
}: {
	modalState: ModalStateEnum;
}): JSX.Element | null {
	switch (modalState) {
		case ModalStateEnum.WAITING:
			return (
				<Callout color="info" size="sm" icon={<SolidInfoCircle />}>
					<div className="cloud-account-setup-form__alert-message">
						<Spin
							indicator={
								<LoaderCircle
									size={14}
									className="anticon anticon-loading anticon-spin ant-spin-dot"
								/>
							}
						/>
						Waiting for connection, retrying in <span className="retry-time">10</span>{' '}
						secs...
					</div>
				</Callout>
			);
		case ModalStateEnum.ERROR:
			return (
				<Callout color="danger" size="sm" icon={<SolidAlertCircle />}>
					<div className="cloud-account-setup-form__alert-message">
						We couldn&apos;t establish a connection to your AWS account. Please try
						again
					</div>
				</Callout>
			);
		default:
			return null;
	}
}

export default AlertMessage;

import './SignozModal.style.scss';

import { Modal, ModalProps } from 'antd';

function SignozModal({
	children,
	className = '',
	...rest
}: ModalProps): JSX.Element {
	return (
		<Modal
			centered
			width={672}
			rootClassName={`signoz-modal ${className}`}
			cancelText="Close"
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...rest}
		>
			{children}
		</Modal>
	);
}

export default SignozModal;

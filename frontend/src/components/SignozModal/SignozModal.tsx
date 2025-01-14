import './SignozModal.style.scss';

import { Modal, ModalProps } from 'antd';

function SignozModal({
	children,

	rootClassName = '',
	...rest
}: ModalProps): JSX.Element {
	return (
		<Modal
			centered
			width={672}
			cancelText="Close"
			rootClassName={`signoz-modal ${rootClassName}`}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...rest}
		>
			{children}
		</Modal>
	);
}

export default SignozModal;

import { Modal, ModalProps } from 'antd';

import './SignozModal.style.scss';

function SignozModal({
	children,
	width = 672,
	rootClassName = '',
	...rest
}: ModalProps): JSX.Element {
	return (
		<Modal
			centered
			width={width}
			cancelText="Close"
			rootClassName={`signoz-modal ${rootClassName}`}
			{...rest}
		>
			{children}
		</Modal>
	);
}

export default SignozModal;

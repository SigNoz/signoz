import './ErrorModal.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Modal, Tag } from 'antd';
import { CircleAlert, X } from 'lucide-react';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import React from 'react';
import { ErrorV2 } from 'types/api';

import ErrorContent from './components/ErrorContent';

type Props = {
	error: ErrorV2;
	triggerComponent?: React.ReactElement;
	onClose?: () => void;
};

const classNames = {
	body: 'error-modal__body',
	mask: 'error-modal__mask',
	header: 'error-modal__header',
	footer: 'error-modal__footer',
	content: 'error-modal__content',
};

function ErrorModal({ error, triggerComponent, onClose }: Props): JSX.Element {
	const [visible, setVisible] = React.useState(false);

	const handleClose = (): void => {
		setVisible(false);
		onClose?.();
	};

	return (
		<>
			{!triggerComponent ? (
				<Tag
					className="error-modal__trigger"
					icon={<CircleAlert size={14} color={Color.BG_CHERRY_500} />}
					color="error"
					onClick={(): void => setVisible(true)}
				>
					error
				</Tag>
			) : (
				React.cloneElement(triggerComponent, {
					onClick: () => setVisible(true),
				})
			)}

			<Modal
				open={visible}
				footer={<div className="error-modal__footer" />}
				title={
					<>
						{/* TODO(shaheer): get the version */}
						<KeyValueLabel badgeKey="ENTERPRISE" badgeValue="v3.4.55" />
						<Button type="default" className="close-button" onClick={handleClose}>
							<X size={16} color={Color.BG_VANILLA_400} />
						</Button>
					</>
				}
				onCancel={handleClose}
				closeIcon={false}
				classNames={classNames}
				wrapClassName="error-modal__wrap"
			>
				{/* {JSON.stringify(error)} */}
				<ErrorContent error={error} />
			</Modal>
		</>
	);
}

ErrorModal.defaultProps = {
	onClose: undefined,
	triggerComponent: null,
};

export default ErrorModal;

import './ErrorModal.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Modal, Tag } from 'antd';
import { CircleAlert, X } from 'lucide-react';
import KeyValueLabel from 'periscope/components/KeyValueLabel';
import { useAppContext } from 'providers/App/App';
import React from 'react';
import { useQueryClient } from 'react-query';
import { ErrorV2 } from 'types/api';
import { PayloadProps } from 'types/api/user/getVersion';

import ErrorContent from './components/ErrorContent';

type Props = {
	error: ErrorV2;
	triggerComponent?: React.ReactElement;
	onClose?: () => void;
	open?: boolean;
};

const classNames = {
	body: 'error-modal__body',
	mask: 'error-modal__mask',
	header: 'error-modal__header',
	footer: 'error-modal__footer',
	content: 'error-modal__content',
};

function ErrorModal({
	open,
	error,
	triggerComponent,
	onClose,
}: Props): JSX.Element {
	const [visible, setVisible] = React.useState(open);

	const handleClose = (): void => {
		setVisible(false);
		onClose?.();
	};

	const queryClient = useQueryClient();

	const { user } = useAppContext();

	const versionData = queryClient.getQueryData([
		'getUserVersion',
		user?.accessJwt,
	]) as { payload: PayloadProps } | undefined;

	const versionDataPayload = versionData?.payload;

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
						{versionDataPayload ? (
							<KeyValueLabel
								badgeKey={versionDataPayload.ee === 'Y' ? 'ENTERPRISE' : 'COMMUNITY'}
								badgeValue={versionDataPayload.version}
							/>
						) : (
							<div className="error-modal__version-placeholder" />
						)}
						<Button
							type="default"
							className="close-button"
							onClick={handleClose}
							data-testid="close-button"
						>
							<X size={16} color={Color.BG_VANILLA_400} />
						</Button>
					</>
				}
				onCancel={handleClose}
				closeIcon={false}
				classNames={classNames}
				wrapClassName="error-modal__wrap"
			>
				<ErrorContent error={error} />
			</Modal>
		</>
	);
}

ErrorModal.defaultProps = {
	onClose: undefined,
	triggerComponent: null,
	open: false,
};

export default ErrorModal;

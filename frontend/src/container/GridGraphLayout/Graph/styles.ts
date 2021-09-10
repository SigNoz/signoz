import { Modal as ModalComponent } from 'antd';
import styled from 'styled-components';

export const Modal = styled(ModalComponent)`
	.ant-modal-content,
	.ant-modal-body {
		min-height: 60vh;
	}
`;

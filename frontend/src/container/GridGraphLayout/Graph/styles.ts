import { Modal as ModalComponent } from 'antd';
import styled from 'styled-components';

interface Props {
	height?: string;
}

export const Modal = styled(ModalComponent)<Props>`
	.ant-modal-content,
	.ant-modal-body {
		min-height: ${({ height = '80vh' }): string => height};
	}
`;

export const FullViewContainer = styled.div`
	height: 70vh;
`;

export const ErrorContainer = styled.div`
	margin-top: 2rem;
	padding-left: 2rem;
	padding-right: 2rem;
`;

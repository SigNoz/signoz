import { Col, Tag as AntDTag } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	min-height: 78vh;
	display: flex;
	flex-direction: column;
`;

export const RightContainerWrapper = styled(Col)`
	&&& {
		min-width: 200px;
	}
`;

interface LeftContainerWrapperProps {
	isDarkMode: boolean;
}

export const LeftContainerWrapper = styled(Col)<LeftContainerWrapperProps>`
	&&& {
		max-width: 70%;
		border-right: ${({ isDarkMode }): string =>
			isDarkMode
				? '1px solid var(--bg-slate-300)'
				: '1px solid var(--bg-vanilla-300)'};
	}
`;

export const ButtonContainer = styled.div`
	display: flex;
	gap: 8px;
	margin-bottom: 1rem;
	justify-content: flex-end;
`;

export const PanelContainer = styled.div`
	display: flex;
`;

export const Tag = styled(AntDTag)`
	margin: 0;
`;

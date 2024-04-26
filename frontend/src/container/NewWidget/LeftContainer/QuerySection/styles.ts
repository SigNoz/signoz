import { Button } from 'antd';
import styled from 'styled-components';

export const InputContainer = styled.div`
	width: 50%;
`;

export const Container = styled.div`
	margin-top: 1rem;
	display: flex;
	flex-direction: column;
`;

export const QueryButton = styled(Button)`
	&&& {
		display: flex;
		align-items: center;
	}
`;

export const QueryWrapper = styled.div`
	width: 100%;
	margin: 0;
	padding: 0.5rem 0;
	display: flex;
	flex-direction: column;
`;

export const QueryBuilderWrapper = styled.div<{ isDarkMode: boolean }>`
	background: ${({ isDarkMode }): string => (isDarkMode ? '#000' : '#efefef')};
`;

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		align-items: center;
		flex-direction: column;

		> button {
			margin-bottom: 1rem;
		}
	}
`;

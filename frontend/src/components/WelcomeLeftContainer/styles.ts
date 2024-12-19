import { Space } from 'antd';
import styled from 'styled-components';

export const LeftContainer = styled(Space)`
	flex: 1;
`;

export const Logo = styled.img`
	width: 60px;
`;

export const Container = styled.div`
	&&& {
		display: flex;
		justify-content: center;
		gap: 16px;
		align-items: center;
		min-height: 100vh;

		max-width: 1024px;
		margin: 0 auto;
	}
`;

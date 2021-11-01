import { Space, Typography } from 'antd';
import styled from 'styled-components';

export const Container = styled(Space)`
	&&& {
		padding-left: 2rem;
		margin-top: 3rem;
	}
`;

export const Title = styled(Typography)`
	&&& {
		font-size: 1rem;
		font-weight: bold;
	}
`;

export const FormWrapper = styled.div`
	display: flex;
	justify-content: center;

	margin-top: 2rem;
`;

export const ButtonContainer = styled.div`
	margin-top: 0.5rem;
`;

export const LogoImageContainer = styled.img`
	width: 320px;
`;

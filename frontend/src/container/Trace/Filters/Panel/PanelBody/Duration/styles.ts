import styled from 'styled-components';
import { Input, Typography } from 'antd';

export const DurationText = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-around;
	min-height: 8vh;
`;

export const InputComponent = styled(Input)`
	&&& {
		max-width: 3rem;
	}
`;

export const TextCotainer = styled.div`
	&&& {
		display: flex;
		align-items: center;
	}
`;

export const Text = styled(Typography)`
	&&& {
		margin-left: 0.5rem;
		margin-right: 0.5rem;
	}
`;

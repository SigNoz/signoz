import { Button, Typography } from 'antd';
import Modal from 'components/Modal';

function SkipOnBoardingModal({ onContinueClick }: Props): JSX.Element {
	return (
		<Modal
			title="Setup instrumentation"
			isModalVisible
			closable={false}
			footer={[
				<Button key="submit" type="primary" onClick={onContinueClick}>
					Continue without instrumentation
				</Button>,
			]}
		>
			<>
				<iframe
					width="100%"
					height="265"
					src="https://www.youtube.com/embed/J1Bof55DOb4"
					frameBorder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
					title="youtube_video"
				/>
				<div>
					<Typography>No instrumentation data.</Typography>
					<Typography>
						Please instrument your application as mentioned&nbsp;
						<a
							href="https://signoz.io/docs/instrumentation/overview"
							target="_blank"
							rel="noreferrer"
						>
							here
						</a>
					</Typography>
				</div>
			</>
		</Modal>
	);
}

interface Props {
	onContinueClick: () => void;
}

export default SkipOnBoardingModal;

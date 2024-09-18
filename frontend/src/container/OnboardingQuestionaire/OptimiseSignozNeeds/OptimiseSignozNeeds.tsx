import { Button, Slider, SliderSingleProps, Typography } from 'antd';
import { ArrowLeft, ArrowRight, Minus } from 'lucide-react';

interface OptimiseSignozNeedsProps {
	onNext: () => void;
	onBack: () => void;
}

const logMarks: SliderSingleProps['marks'] = {
	0: '2 GB',
	25: '25 GB',
	50: '50 GB',
	100: '100 GB',
};

const hostMarks: SliderSingleProps['marks'] = {
	0: '0',
	20: '20',
	40: '40',
	60: '60',
	80: '80',
	100: '100',
};

const serviceMarks: SliderSingleProps['marks'] = {
	0: '0',
	20: '20',
	40: '40',
	60: '60',
	80: '80',
	100: '100',
};

function OptimiseSignozNeeds({
	onNext,
	onBack,
}: OptimiseSignozNeedsProps): JSX.Element {
	return (
		<div className="questions-container">
			<Typography.Title level={3} className="title">
				Optimize SigNoz for Your Needs
			</Typography.Title>
			<Typography.Paragraph className="sub-title">
				Give us a quick sense of your scale so SigNoz can keep up!
			</Typography.Paragraph>

			<div className="questions-form-container">
				<div className="questions-form">
					<Typography.Paragraph className="question">
						What does your scale approximately look like?
					</Typography.Paragraph>

					<div className="form-group">
						<label className="question" htmlFor="organisationName">
							Logs / Day
						</label>
						<div className="slider-container">
							<Slider
								marks={logMarks}
								defaultValue={25}
								styles={{
									track: {
										background: '#4E74F8',
									},
								}}
							/>
						</div>
					</div>

					<div className="form-group">
						<label className="question" htmlFor="organisationName">
							Metrics <Minus size={14} /> Number of Hosts / Day
						</label>
						<div className="slider-container">
							<Slider
								marks={hostMarks}
								defaultValue={40}
								styles={{
									track: {
										background: '#4E74F8',
									},
								}}
							/>
						</div>
					</div>

					<div className="form-group">
						<label className="question" htmlFor="organisationName">
							Number of services
						</label>
						<div className="slider-container">
							<Slider
								marks={serviceMarks}
								defaultValue={10}
								styles={{
									track: {
										background: '#4E74F8',
									},
								}}
							/>
						</div>
					</div>
				</div>

				<div className="next-prev-container">
					<Button type="default" className="next-button" onClick={onBack}>
						<ArrowLeft size={14} />
						Back
					</Button>

					<Button type="primary" className="next-button" onClick={onNext}>
						Next
						<ArrowRight size={14} />
					</Button>
				</div>

				<div className="do-later-container">
					<Button type="link" onClick={onNext}>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default OptimiseSignozNeeds;

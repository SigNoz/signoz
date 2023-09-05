import './ProgressSteps.scss';

import { useState } from 'react';
import cx from 'classnames';
import styled from 'styled-components';

import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';

function ProgressSteps({ steps }): JSX.Element {
	const [activeStep, setActiveStep] = useState(1);

	const nextStep = (): void => {
		setActiveStep(activeStep + 1);
	};

	const prevStep = (): void => {
		setActiveStep(activeStep - 1);
	};

	const totalSteps = steps.length;

	// const width = `${(100 / (totalSteps - 1)) * (activeStep - 1)}%`;

	return (
		<div className="mainContainer">
			<div className="stepContainer">
				{steps.map(({ step, title, subTitle }) => (
					<div className="stepWrapper" key={step}>
						<div
							className={cx(
								'stepStyle',
								activeStep >= step ? 'completed' : 'incomplete',
							)}
						>
							{activeStep > step ? (
								<div className="checkMark">L</div>
							) : (
								<div className="stepCount">{step}</div>
							)}
						</div>

						<div className="stepsLabelContainer">
							<div className="stepTitle" key={step}>
								{title}
							</div>
							<div className="stepSubTitle" key={step}>
								{subTitle}
							</div>
						</div>
					</div>
				))}
			</div>
			<div className="actionButtonsContainer">
				<Button
					type="primary"
					onClick={prevStep}
					icon={<ArrowLeftOutlined />}
					ghost
				>
					Back
				</Button>

				<Button type="primary" onClick={nextStep} icon={<ArrowRightOutlined />}>
					Continue to next step
				</Button>
			</div>
		</div>
	);
}

export default ProgressSteps;

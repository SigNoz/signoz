import './Javascript.styles.scss';

import { MDXProvider } from '@mdx-js/react';

import { Steps, Select } from 'antd';

import Post from './javascript.md';

export default function Javascript({ activeStep }): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="javascript-setup-instructions-container">
					<div className="header">
						<img
							className={'supported-language-img'}
							src={`/Logos/javascript.png`}
							alt=""
						/>
						<div className="title">
							<h1>Javascript OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/javascript/"
								>
									here
								</a>
							</div>
						</div>
					</div>

					<div className="framework-selector">
						<div className="label"> Select Framework </div>

						<Select
							defaultValue="Express"
							style={{ minWidth: 120 }}
							placeholder="Select Framework"
							options={[
								{
									value: 'express',
									label: 'Express',
								},
								{
									value: 'nestjs',
									label: 'Nestjs',
								},
								{
									value: 'angular',
									label: 'Angular',
								},
								{
									value: 'other',
									label: 'Other',
								},
							]}
						/>
					</div>

					<div className="content-container">
						<MDXProvider>
							<Post />
						</MDXProvider>
					</div>
				</div>
			)}
			{activeStep === 3 && (
				<div className="connection-status-container">
					<Steps
						progressDot
						current={1}
						direction="vertical"
						items={[
							{
								title: 'Finished',
								description: 'Ping Successful',
							},
							{
								title: 'Waiting',
								description: 'Receiving Data from the application',
							},
						]}
					/>
				</div>
			)}
		</>
	);
}

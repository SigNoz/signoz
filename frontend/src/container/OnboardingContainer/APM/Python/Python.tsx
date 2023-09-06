import './Python.styles.scss';

import { MDXProvider } from '@mdx-js/react';

import { Steps, Select } from 'antd';

import Post from './python.md';

export default function Python({ activeStep }): JSX.Element {
	return (
		<>
			{activeStep === 2 && (
				<div className="python-setup-instructions-container">
					<div className="header">
						<img
							className={'supported-language-img'}
							src={`/Logos/python.png`}
							alt=""
						/>

						<div className="title">
							<h1>Python OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/python/"
								>
									here
								</a>
							</div>
						</div>
					</div>

					<div className="framework-selector">
						<div className="label"> Select Framework </div>

						<Select
							defaultValue="Django"
							style={{ minWidth: 120 }}
							placeholder="Select Framework"
							options={[
								{
									value: 'django',
									label: 'Django',
								},
								{
									value: 'fastAPI',
									label: 'FastAPI',
								},
								{
									value: 'flask',
									label: 'Flask',
								},
								{
									value: 'falcon',
									label: 'Falcon',
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

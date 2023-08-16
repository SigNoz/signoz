import { Typography } from 'antd';

import { GetStartedContent } from './renderConfig';
import DocSection from './Section';

function InstrumentationPage(): JSX.Element {
	return (
		<>
			<Typography>
				Congrats, you have successfully installed SigNoz! Now lets get some data in
				and start deriving insights from them
			</Typography>
			{GetStartedContent().map((section) => (
				<DocSection key={section.heading} sectionData={section} />
			))}
		</>
	);
}

export default InstrumentationPage;

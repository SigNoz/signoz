/* eslint-disable global-require */
/// <reference types="@welldone-software/why-did-you-render" />
// ^ https://github.com/welldone-software/why-did-you-render/issues/161
import React from 'react';

if (process.env.NODE_ENV === 'development') {
	import('@welldone-software/why-did-you-render').then((whyDidYouRender) => {
		whyDidYouRender.default(React, {
			trackAllPureComponents: true,
			trackHooks: true,
			// https://github.com/welldone-software/why-did-you-render/issues/85#issuecomment-596682587
			trackExtraHooks: [require('react-redux/lib'), 'useSelector'],
			include: [/^ConnectFunction/],
			logOnDifferentValues: true,
		});
	});
}

/// <reference types="@welldone-software/why-did-you-render" />
// ^ https://github.com/welldone-software/why-did-you-render/issues/161
import React from 'react';

if (process.env.NODE_ENV === 'development') {
	import('@welldone-software/why-did-you-render').then((func) => {
		func.default(React, {
			trackAllPureComponents: false,
			trackExtraHooks: [[import('react-redux'), 'useSelector']],
			include: [/^ConnectFunction/],
			logOnDifferentValues: true,
		});
	});
}

export default '';

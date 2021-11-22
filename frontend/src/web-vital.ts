import { getCLS, getFID, getLCP } from 'web-vitals';

if (process.env.NODE_ENV === 'development') {
	getCLS(console.log, true);
	getFID(console.log, true);
	getLCP(console.log, true);
}

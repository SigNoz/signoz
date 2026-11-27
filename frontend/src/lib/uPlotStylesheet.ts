import href from 'uplot/dist/uPlot.min.css?url';

// Appended to the end of <body> so uPlot's rules win ties over the app's stylesheets.
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = href;
document.body.appendChild(link);

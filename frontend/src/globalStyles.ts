import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
#root,
html,
body {
  height: 100%;
  overflow: hidden;
}

body {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

 .u-legend {
    max-height: 30px; // slicing the height of the widget Header height ;
    overflow-y: auto;
}
`;

export default GlobalStyles;

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
`;

export default GlobalStyles;

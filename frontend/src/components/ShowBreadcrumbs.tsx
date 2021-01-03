import React from 'react';
import {Breadcrumb} from 'antd';
import { Link, withRouter } from 'react-router-dom';
import styled from 'styled-components';

const BreadCrumbWrapper = styled.div`
padding-top:20px;
padding-left:20px;
`;


const breadcrumbNameMap :any = {  // PNOTE - TO DO - Remove any and do typechecking - like https://stackoverflow.com/questions/56568423/typescript-no-index-signature-with-a-parameter-of-type-string-was-found-on-ty 
    '/application': 'Application',
    '/traces': 'Traces',
    '/service-map': 'Service Map',
    '/usage-explorer': 'Usage Explorer',
// only top level things should be  mapped here, rest should be taken dynamically from url
// Does this work if url has 2 levels of dynamic parameters? - Currently we have only 1 level
// this structure ignores query params like time -- which is good
};


const ShowBreadcrumbs = withRouter(props => {
    const { location } = props;
    const pathSnippets = location.pathname.split('/').filter(i => i);
    const extraBreadcrumbItems = pathSnippets.map((_, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
      if (breadcrumbNameMap[url] === undefined){
          return (
            <Breadcrumb.Item key={url}>
                <Link to={url}>{url.split('/').slice(-1)[0]}</Link>
            </Breadcrumb.Item>
          );
      } else 
      {
        return (
            <Breadcrumb.Item key={url}>
                <Link to={url}>{breadcrumbNameMap[url]}</Link>
            </Breadcrumb.Item>
        );
      }


      
    });
    const breadcrumbItems = [
      <Breadcrumb.Item key="home">
        <Link to="/">Home</Link>
      </Breadcrumb.Item>,
    ].concat(extraBreadcrumbItems);
    return (
      
        <BreadCrumbWrapper>
            <Breadcrumb>{breadcrumbItems}</Breadcrumb>
        </BreadCrumbWrapper>

    );
  });





// const ShowBreadcrumbs = () => {

//         return (
//             <Breadcrumb style={{ margin: '16px 0' , fontSize: 12 }}>
//               <Breadcrumb.Item>
//               <Link to="/">Home</Link></Breadcrumb.Item>
//               <Breadcrumb.Item><Link to="/application">Application</Link></Breadcrumb.Item>
//             </Breadcrumb>
//             //programmatically populate it with links
//         );
        
// }

export default ShowBreadcrumbs;
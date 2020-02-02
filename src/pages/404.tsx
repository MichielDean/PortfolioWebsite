import * as React from 'react';
import { Content, Header, Layout, Wrapper } from '../components';
import Helmet from 'react-helmet';
import config from '../../config/SiteConfig';
import { Link } from 'gatsby';

export default class NotFoundPage extends React.Component<any> {
  public render() {
    return (
      <Layout>
        <Wrapper>
          <Helmet title={`404 not found | ${config.siteTitle}`} />
          <Header />
          <Content>
            <h1>NOT FOUND</h1>
            <p>You have landed on a page that does not exist.</p>
            <p>Please use the link below to navigate back to the home page.</p>
            <Link to="/">{config.siteTitle}</Link>
          </Content>
        </Wrapper>
      </Layout>
    );
  }
}

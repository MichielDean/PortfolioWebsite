import React from 'react';
import styled from 'styled-components';
import { Layout, Wrapper } from '../components';
import PageProps from '../models/PageProps';
import Helmet from 'react-helmet';
import config from '../../config/SiteConfig';
import { media } from '../utils/media';
import rgba from 'polished/lib/color/rgba';
import darken from 'polished/lib/color/darken';
import lighten from 'polished/lib/color/lighten';
import Collapsible from 'react-collapsible';
import { WorkHistory } from '../components/WorkHistory';
import {
  LionBridgeEmploymentData,
  ScentsyEmploymentData,
  RpsEmploymentData,
  JelliEmploymentData,
} from '../data/employmentData/employmentData';
import { EmailLink } from '../components/EmailLink';

const Homepage = styled.main`
  display: flex;
  height: 100vh;
  flex-direction: row;
  @media ${media.tablet} {
    height: 100%;
    flex-direction: column;
  }
  @media ${media.phone} {
    height: 100%;
    flex-direction: column;
  }
`;

const GridRow: any = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${(props: any) =>
    props.background
      ? `linear-gradient(-185deg,
      ${rgba(darken(0.1, props.theme.colors.primary), 0.7)}, 
      ${rgba(lighten(0.1, props.theme.colors.grey.dark), 0.9)}), url(/assets/bg.png) no-repeat`
      : null};
  background-size: cover;
  padding: 2rem 4rem;
  color: ${(props: any) => (props.background ? props.theme.colors.white : null)};
  h1 {
    color: ${(props: any) => (props.background ? props.theme.colors.white : null)};
  }
  @media ${media.tablet} {
    padding: 3rem 3rem;
  }
  @media ${media.phone} {
    padding: 2rem 1.5rem;
  }
`;

const HomepageContent: any = styled.div`
  max-width: 45rem;
  text-align: ${(props: any) => (props.center ? 'center' : 'left')};
`;

export default class IndexPage extends React.Component<PageProps> {
  public render() {
    return (
      <Layout>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css" />
        <Wrapper fullWidth={true}>
          <Helmet title={`${config.siteTitle}`} />
          <Homepage>
            <GridRow background={true}>
              <HomepageContent center={true}>
                <img src={config.siteLogo} className="logo-image round-image-edges" />
                <h1>Hello. I'm Michiel Bugher.</h1>
                <p>A software developer with a passion for quality code.</p>
                <a href="https://www.linkedin.com/in/michielbugher">
                  <img className="contact-logo" src={config.linkedInLogo} alt="Linked In" />
                </a>
                <a href="https://github.com/MichielDean">
                  <img className="contact-logo" src={config.gitHubLogo} alt="Github" />
                </a>
                <a href={config.resumePdf} download="MichielBugherResume.pdf">
                  <img className="contact-logo" src={config.cvLogo} alt="CV" />
                </a>
                <EmailLink />
              </HomepageContent>
            </GridRow>
            <GridRow>
              <HomepageContent>
                <Collapsible trigger="About Me" open={true}>
                  <p>
                    I have been testing software since 2007 and I started learning to write code in 2011. To feed my continual thirst for
                    knowledge, I regularly take online courses on Coursera and buy/read relevant books. There's almost always some sort of
                    side project that I'm developing to flex my software muscles.
                  </p>
                  <p>I love spending time with my family and traveling. I am comfortable hiking outdoors, or inside playing video games.</p>
                </Collapsible>
                <Collapsible trigger="Employment History" lazyRender={true} overflowWhenOpen="auto">
                  <WorkHistory employmentData={new JelliEmploymentData()} />
                  <WorkHistory employmentData={new RpsEmploymentData()} />
                  <WorkHistory employmentData={new ScentsyEmploymentData()} />
                  <WorkHistory employmentData={new LionBridgeEmploymentData()} />
                </Collapsible>
                <Collapsible trigger="Technology / Skills">
                  <div>
                    <p>c#</p>
                    <p>Java</p>
                    <p>Javascript (React, Angular, Protractor)</p>
                    <p>Typescript</p>
                    <p>SQL</p>
                    <p>Selenium</p>
                    <p>Test Automation</p>
                  </div>
                </Collapsible>
              </HomepageContent>
            </GridRow>
          </Homepage>
        </Wrapper>
      </Layout>
    );
  }
}

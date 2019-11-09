import React from 'react';
import { StaticQuery, graphql } from 'gatsby';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import theme from '../../config/Theme';
import { media } from '../utils/media';
import split from 'lodash/split';
import './layout.scss';

const GlobalStyle = createGlobalStyle`
  ::selection {
    color: ${theme.colors.bg};
    background: ${theme.colors.primary};
  }
  body {
    background: ${theme.colors.bg};
    color: ${theme.colors.grey.default};
    @media ${media.phone} {
      font-size: 14px;
    }
  }
  a {
    color: ${theme.colors.grey.dark};
    text-decoration: none;
    transition: all ${theme.transitions.normal};
  }
  a:hover {
    color: ${theme.colors.primary};
  }
  h1, h2, h3, h4 {
    color: ${theme.colors.grey.dark};
  }
  blockquote {
    font-style: italic;
    position: relative;
  }

  blockquote:before {
    content: "";
    position: absolute;
    background: ${theme.colors.primary};
    height: 100%;
    width: 6px;
    margin-left: -1.6rem;
  }
  label {
    margin-bottom: .5rem;
    color: ${theme.colors.grey.dark};
  }
  input, textarea {
    border-radius: .5rem;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    padding: .25rem 1rem;
    &:focus {
      outline: none;
    }
  }
  .textRight {
    text-align:right;
  }
  .logo-image {
    width: 150px;
    height: auto;
  }
  .round-image-edges {
    border-radius: 25%;
  }
  .contact-logo {
    margin-left: 10px;
    width: auto;
    height: 34px;
  }
  .name-tooltip {
    position: relative;
  }
  .name-tooltip .name-tooltip-text {
    visibility: hidden;
    width: 130px;
    height: 35px;
    background-color: transparent;
    position: absolute;
    top: -35px;
    left: 60%;
  }
  .name-tooltip:hover .name-tooltip-text {
    visibility: visible;
  }
  .Collapsible__trigger {
    display: block;
    position: relative;
    background: ${theme.colors.primary};
    padding: 10px;
    color: ${theme.colors.white}
    text-align: center

    &:after {
      font-family: 'FontAwesome';
      content: '\f107';
      position: absolute;
      right: 10px;
      top: 10px;
      display: block;
    }

    &.is-open {
      &:after {
        transform: rotateZ(180deg);
      }
    }
  }
  .Collapsible__contentInner {
    padding: 10px;
    border: 1px solid ${theme.colors.primary};
    border-top: 0;
    max-height:450px;
    overflow:auto;

    p {
      margin-bottom: 10px;
      line-height: 20px;
  
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
`;

const Footer = styled.footer`
  text-align: left;
  padding: 1rem 0;
  span {
    font-size: 0.75rem;
  }
`;

export class Layout extends React.PureComponent<{}> {
  public render() {
    const { children } = this.props;

    return (
      <StaticQuery
        query={graphql`
          query LayoutQuery {
            site {
              buildTime(formatString: "DD.MM.YYYY")
            }
          }
        `}
        render={data => (
          <ThemeProvider theme={theme}>
            <React.Fragment>
              <GlobalStyle />
              {children}
              <Footer>
                &copy; {split(data.site.buildTime, '.')[2]} Michiel Bugher. All rights reserved. <br />
                <a href="https://github.com/MichielDean/PortfolioWebsite">GitHub Repository</a> <br />
                <span>Last build: {data.site.buildTime}</span>
              </Footer>
            </React.Fragment>
          </ThemeProvider>
        )}
      />
    );
  }
}

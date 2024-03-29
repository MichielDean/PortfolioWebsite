import React from 'react'
import styled from 'styled-components'
import loadable from '@loadable/component'
import Wrapper from '../components/wrapper'
import SEO from '../components/SEO'

const Layout = loadable(() => import('../components/layout'))

const MainTitle = styled.h1`
  line-height: 1.5;
  text-align: center;
  font-size: 3rem;
`

const Text = styled.p`
  text-align: center;
`

const NotFoundPage = ({ location }) => (
  <Layout location={location} noCover={true}>
    <SEO title="Page Not Found" />
    <Wrapper>
      <MainTitle>404 Page Not Found</MainTitle>
      <Text>
        Looks like you've followed a broken link or entered a URL that
        doesn't exist on this site.
      </Text>
    </Wrapper>
  </Layout>
)

export default NotFoundPage

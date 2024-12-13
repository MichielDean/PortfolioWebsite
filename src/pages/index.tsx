import * as React from "react"
import type { HeadFC, PageProps } from "gatsby"
import { ThemeProvider, useTheme } from "../context/ThemeContext"
import { getMainContainerStyles } from '../styles/pageStyles';
import { useWindowSize } from '../hooks/useWindowSize';
import AboutMe from '../components/AboutMe';
import WorkHistory from '../components/WorkHistory';

const IndexPage: React.FC<PageProps> = () => {
  const { colors } = useTheme();
  const { isMobile } = useWindowSize();

  return (
    <main style={getMainContainerStyles(colors, isMobile)}>
      <AboutMe />
      <WorkHistory />
    </main>
  );
}

const IndexWrapper = (props: PageProps) => (
  <ThemeProvider>
    <IndexPage {...props} />
  </ThemeProvider>
);

export default IndexWrapper

export const Head: HeadFC = () => <title>Home Page</title>

import { Helmet } from "react-helmet-async"
import { ThemeProvider } from "../context/ThemeContext"
import AboutMe from '../components/AboutMe';
import WorkHistory from '../components/WorkHistory';
import * as styles from './index.module.css';

const IndexPage = () => {
  return (
    <>
      <Helmet>
        <title>Michiel Bugher - Software Engineering Leader</title>
        <meta name="description" content="Michiel Bugher - Director of Software Engineering with 17+ years in Quality Assurance and Test Automation" />
      </Helmet>
      <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--text)' }}>
        <main className={styles.main}>
          <AboutMe />
          <WorkHistory />
        </main>
        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} Michiel Bugher. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}

const IndexWrapper = () => (
  <ThemeProvider>
    <IndexPage />
  </ThemeProvider>
);

export default IndexWrapper

import * as React from 'react';
import ThemeToggle from './ThemeToggle';
import ScrollExperience from './ScrollExperience';
import { profileData } from "../data/profileData";
import * as styles from './WorkHistory.module.css';

const WorkHistory: React.FC = () => {
  return (
    <div className={styles.container}>
      <ThemeToggle />
      <ScrollExperience workHistory={profileData.workHistory} />
    </div>
  );
};

export default WorkHistory;

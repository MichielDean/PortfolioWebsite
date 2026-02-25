import { profileData } from "../data/profileData";
import { calculateYearsInIndustry } from "../utils/dateUtils";
import * as styles from './AboutMe.module.css';
import profileImage from '../images/me.png';

const AboutMe = () => {
  const yearsOfExperience = calculateYearsInIndustry(profileData.workHistory);
  const ProfileImage = (
    <div className={styles.profileImage}>
      <img
        src={profileImage}
        alt="Michiel Bugher"
        width={150}
        height={150}
        style={{
          margin: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );

  return (
    <aside className={styles.container}>
      <div className={styles.header}>
        {ProfileImage}
        <div className={styles.headerContent}>
          <h1 className={styles.name}>Michiel Bugher</h1>
          <h2 className={styles.title}>Director of Software Engineering</h2>
          <div className={styles.socialLinks}>
            <a href={profileData.linkedin} className={styles.socialLink}>
              LinkedIn
            </a>
            <a href={profileData.github} className={styles.socialLink}>
              GitHub
            </a>
            <a href={profileData.stackOverflow} className={styles.socialLink}>
              Stack Overflow
            </a>
          </div>
        </div>
      </div>

      <div className={styles.divider}>
        <h3 className={styles.sectionTitle}>About Me</h3>
        <div className={styles.content}>
          <p>
            Hello! I'm Michiel Bugher (pronounced "Michael Boo-yer"), a software engineering leader with over {yearsOfExperience} years of experience spanning quality engineering, test automation, and full engineering team leadership. I currently serve as Director of Software Engineering at Triton Digital, where I lead development and QA teams across the advertising stack.
          </p>
          <p>
            My career began in software testing in 2007, and I moved into coding in 2011 before stepping into management in 2019. Over time my focus has expanded well beyond QA — I now drive technical strategy, cross-functional collaboration, and organizational adoption of emerging technologies including GitHub Copilot, MCP, and LLM-assisted development workflows. I'm passionate about helping engineering teams work smarter, ship higher-quality software, and grow professionally.
          </p>
          <p>
            Outside of work, I cherish time with my family and exploring new places. Whether I'm hiking in the great outdoors or indulging in a thrilling video game session, I find joy in both adventure and relaxation.
          </p>
          <p>
            I thrive in environments where personal care is paramount, and where team members are empowered to challenge each other constructively, fostering a culture of growth and mutual respect.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default AboutMe;

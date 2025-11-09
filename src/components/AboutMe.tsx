import { profileData } from "../data/profileData";
import * as styles from './AboutMe.module.css';
import profileImage from '../images/me.png';

const AboutMe = () => {
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
            Hello! I'm Michiel Bugher (pronounced "Michael Boo-yer"), a seasoned software engineering leader with over 17 years of expertise in Quality Assurance and Test Automation. My career journey began as a Software Test Engineer, and I have since advanced to the role of Director of Software Engineering. I am passionate about building high-performing QA teams, implementing robust automation strategies, and fostering a culture centered on quality.
          </p>
          <p>
            I have been immersed in the world of software testing since 2007, and my journey into coding began in 2011. My career trajectory has been shaped by a strong foundation in technical expertise and a passion for innovation. In early 2019, I embraced my first management role, driven by my inherent leadership skills and a commitment to guiding teams towards excellence.
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

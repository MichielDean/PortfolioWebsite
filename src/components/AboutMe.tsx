import * as React from 'react';
import { StaticImage } from "gatsby-plugin-image";
import { useTheme } from "../context/ThemeContext";
import { useWindowSize } from '../hooks/useWindowSize';
import { profileData } from "../data/profileData";

const AboutMe: React.FC = () => {
  const { colors } = useTheme();
  const { isMobile } = useWindowSize();

  const ProfileImage = isMobile ? (
    <div style={{ 
      width: 80, 
      height: 80, 
      borderRadius: '50%',
      overflow: 'hidden',
      border: `2px solid ${colors.accent}`
    }}>
      <StaticImage
        src="../images/me.png"
        alt="Michiel Bugher"
        width={80}
        height={80}
        style={{ margin: 0 }}
        imgStyle={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  ) : (
    <div style={{ 
      width: 100, 
      height: 100, 
      borderRadius: '50%',
      overflow: 'hidden',
      border: `2px solid ${colors.accent}`
    }}>
      <StaticImage
        src="../images/me.png"
        alt="Michiel Bugher"
        width={100}
        height={100}
        style={{ margin: 0 }}
        imgStyle={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );

  return (
    <aside style={{
      width: '100%',
      padding: isMobile ? '1rem' : '1.5rem',
      backgroundColor: colors.background === '#ffffff' ? '#f8fafc' : colors.containerBg,
      borderRadius: '8px',
      boxShadow: colors.background === '#ffffff' 
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
        : colors.shadow,
      marginBottom: '2rem',
      border: colors.background === '#ffffff' ? '1px solid #e2e8f0' : 'none'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '1rem',
        gap: '1rem'
      }}>
        {ProfileImage}
        <h2 style={{
          fontSize: isMobile ? "1.3rem" : "1.5rem",
          borderBottom: `2px solid ${colors.accent}`,
          paddingBottom: "0.5rem",
          flex: 1
        }}>About Me</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p>Hello! I'm Michiel Bugher (pronounced "Michael Boo-yer"), a seasoned software engineering leader with over 17 years of expertise in Quality Assurance and Test Automation. My career journey began as a Software Test Engineer, and I have since advanced to the role of Director of Software Engineering. I am passionate about building high-performing QA teams, implementing robust automation strategies, and fostering a culture centered on quality.</p>
        <p>I have been immersed in the world of software testing since 2007, and my journey into coding began in 2011. My career trajectory has been shaped by a strong foundation in technical expertise and a passion for innovation. In early 2019, I embraced my first management role, driven by my inherent leadership skills and a commitment to guiding teams towards excellence.</p>
        <p>Outside of work, I cherish time with my family and exploring new places. Whether I'm hiking in the great outdoors or indulging in a thrilling video game session, I find joy in both adventure and relaxation.</p>
        <p>I thrive in environments where personal care is paramount, and where team members are empowered to challenge each other constructively, fostering a culture of growth and mutual respect.</p>
        <p>Feel free to connect with me on <a href={profileData.linkedin} style={{ color: colors.accent }}>LinkedIn</a>, check out my work on <a href={profileData.github} style={{ color: colors.accent }}>GitHub</a>, or view my contributions on <a href={profileData.stackOverflow} style={{ color: colors.accent }}>Stack Overflow</a>.</p>
      </div>
    </aside>
  );
};

export default AboutMe;

import React, { useEffect, useRef, useState } from 'react';
import { WorkHistory } from '../data/profileData';
import { calculateYears, formatDuration, calculateCompanyTotalYears, calculateYearsInIndustry } from '../utils/dateUtils';
import { profileData } from '../data/profileData';
import * as styles from './ScrollExperience.module.css';

interface ScrollExperienceProps {
    workHistory: WorkHistory[];
}

const ScrollExperience: React.FC<ScrollExperienceProps> = ({ workHistory }) => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = window.scrollY / scrollHeight;
            setScrollProgress(progress);

            // Check which sections are visible
            const newVisibleSections = new Set<number>();
            sectionRefs.current.forEach((ref, index) => {
                if (ref) {
                    const rect = ref.getBoundingClientRect();
                    const isVisible = rect.top < window.innerHeight * 0.75 && rect.bottom > 0;
                    if (isVisible) {
                        newVisibleSections.add(index);

                        // Set active index based on center of viewport
                        if (rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5) {
                            setActiveIndex(index);
                        }
                    }
                }
            });
            setVisibleSections(newVisibleSections);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const groupedWorkHistory = workHistory.reduce((acc, curr, index) => {
        if (index === 0 || curr.company !== workHistory[index - 1].company) {
            acc.push({
                company: curr.company,
                positions: [curr]
            });
        } else {
            acc[acc.length - 1].positions.push(curr);
        }
        return acc;
    }, [] as { company: string; positions: WorkHistory[] }[]);

    return (
        <div className={styles.scrollContainer}>
            {/* Progress Indicator */}
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{ transform: `scaleY(${scrollProgress})` }}
                />
            </div>

            {/* Timeline Dots */}
            <div className={styles.timeline}>
                {workHistory.map((_, index) => (
                    <div
                        key={index}
                        className={`${styles.timelineDot} ${activeIndex === index ? styles.timelineDotActive : ''}`}
                    />
                ))}
            </div>

            {/* Hero Section */}
            <div className={styles.heroSection}>
                <div className={styles.heroContent}>
                    <div className={styles.heroLabel}>Director of Software Engineering</div>
                    <h1 className={styles.heroTitle}>
                        <span className={styles.heroTitleLine}>Building</span>
                        <span className={styles.heroTitleLine}>High-Performing</span>
                        <span className={styles.heroTitleLine}>Teams</span>
                    </h1>
                    <div className={styles.heroDescription}>
                        Driving innovation through strategic leadership, technical excellence, and
                        a relentless focus on quality and team development.
                    </div>
                    <div className={styles.heroStats}>
                        <div className={styles.heroStat}>
                            <div className={styles.heroStatLabel}>Leadership</div>
                            <div className={styles.heroStatText}>Cross-functional team direction</div>
                        </div>
                        <div className={styles.heroStat}>
                            <div className={styles.heroStatLabel}>Architecture</div>
                            <div className={styles.heroStatText}>End-to-end test frameworks</div>
                        </div>
                        <div className={styles.heroStat}>
                            <div className={styles.heroStatLabel}>Mentorship</div>
                            <div className={styles.heroStatText}>Team growth & development</div>
                        </div>
                    </div>
                    <div className={styles.scrollIndicator}>
                        <span>Scroll to explore my journey</span>
                        <div className={styles.scrollArrow}>↓</div>
                    </div>
                </div>
            </div>

            {/* Work Experience Sections */}
            {workHistory.map((position, index) => {
                const isVisible = visibleSections.has(index);
                const currentGroup = groupedWorkHistory.find(g => g.positions.includes(position));
                const company = currentGroup?.company;
                const years = formatDuration(calculateYears(position.duration));

                // Check if this is the first position in a company group
                const isFirstInCompany = currentGroup && currentGroup.positions[0] === position;
                const positionInCompany = currentGroup ? currentGroup.positions.indexOf(position) + 1 : 1;
                const totalPositionsInCompany = currentGroup?.positions.length || 1;
                const hasMultiplePositions = totalPositionsInCompany > 1;
                const companyTotalYears = currentGroup ? calculateCompanyTotalYears(currentGroup.positions) : '';

                return (
                    <div key={index}>
                        {/* Company Header - show for first position in every company */}
                        {isFirstInCompany && (
                            <div className={`${styles.companyGroupHeader} ${isVisible ? styles.companyGroupHeaderVisible : ''}`}>
                                <div className={styles.companyGroupBadge}>
                                    <span className={styles.companyGroupIcon}>🏢</span>
                                    <span className={styles.companyGroupName}>{company}</span>
                                    <span className={styles.companyGroupCount}>{totalPositionsInCompany} {totalPositionsInCompany === 1 ? 'Role' : 'Roles'}</span>
                                    <span className={styles.companyGroupDuration}>{companyTotalYears}</span>
                                </div>
                                <div className={styles.companyGroupLine}></div>
                            </div>
                        )}

                        <div
                            ref={(el) => (sectionRefs.current[index] = el)}
                            className={`${styles.experienceSection} ${isVisible ? styles.experienceSectionVisible : ''} ${hasMultiplePositions ? styles.experienceSectionGrouped : ''}`}
                            style={{
                                transform: `translateY(${isVisible ? 0 : 50}px)`,
                                opacity: isVisible ? 1 : 0,
                            }}
                        >
                            <div className={styles.experienceContent}>
                                <div className={styles.experienceHeader}>
                                    <div className={styles.companyBadge}>
                                        <span className={styles.companyDot} />
                                        {company}
                                        {hasMultiplePositions && (
                                            <span className={styles.roleNumber}>
                                                Role {positionInCompany}/{totalPositionsInCompany}
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.duration}>
                                        {position.duration} <span className={styles.durationYears}>• {years}</span>
                                    </div>
                                </div>

                                <h2 className={styles.roleTitle}>{position.role}</h2>

                                <div className={styles.achievementsGrid}>
                                    {position.description.map((item, i) => (
                                        <div
                                            key={i}
                                            className={styles.achievementCard}
                                            style={{
                                                animationDelay: `${i * 0.1}s`,
                                            }}
                                        >
                                            <h3 className={styles.achievementTitle}>{item.description}</h3>
                                            {item.moreInfo && (
                                                <ul className={styles.achievementList}>
                                                    {item.moreInfo.map((info, j) => (
                                                        <li key={j} className={styles.achievementItem}>
                                                            {info}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Decorative Elements */}
                            <div className={styles.decorativeCircle} />
                            <div className={styles.decorativeLine} />
                        </div>
                    </div>
                );
            })}

            {/* Connect Section */}
            <div className={styles.connectSection}>
                <div className={styles.connectContent}>
                    <h2 className={styles.connectTitle}>Let's Connect</h2>
                    <p className={styles.connectSubtitle}>
                        Find me on these platforms and let's collaborate
                    </p>

                    <div className={styles.socialCards}>
                        <a
                            href={profileData.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialCard}
                        >
                            <div className={styles.socialIcon}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </div>
                            <div className={styles.socialInfo}>
                                <h3 className={styles.socialName}>LinkedIn</h3>
                                <p className={styles.socialDescription}>
                                    Professional network & career updates
                                </p>
                            </div>
                            <div className={styles.socialArrow}>→</div>
                        </a>

                        <a
                            href={profileData.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialCard}
                        >
                            <div className={styles.socialIcon}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </div>
                            <div className={styles.socialInfo}>
                                <h3 className={styles.socialName}>GitHub</h3>
                                <p className={styles.socialDescription}>
                                    Open source projects & code samples
                                </p>
                            </div>
                            <div className={styles.socialArrow}>→</div>
                        </a>

                        <a
                            href={profileData.stackOverflow}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialCard}
                        >
                            <div className={styles.socialIcon}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.725 0l-1.72 1.277 6.39 8.588 1.716-1.277L15.725 0zm-3.94 3.418l-1.369 1.644 8.225 6.85 1.369-1.644-8.225-6.85zm-3.15 4.465l-.905 1.94 9.702 4.517.904-1.94-9.701-4.517zm-1.85 4.86l-.44 2.093 10.473 2.201.44-2.092-10.473-2.203zM1.89 15.47V24h19.19v-8.53h-2.133v6.397H4.021v-6.396H1.89zm4.265 2.133v2.13h10.66v-2.13H6.154Z" />
                                </svg>
                            </div>
                            <div className={styles.socialInfo}>
                                <h3 className={styles.socialName}>Stack Overflow</h3>
                                <p className={styles.socialDescription}>
                                    Technical Q&A & community contributions
                                </p>
                            </div>
                            <div className={styles.socialArrow}>→</div>
                        </a>
                    </div>
                </div>
            </div>

            {/* End Section */}
            <div className={styles.endSection}>
                <div className={styles.endContent}>
                    <div className={styles.endIcon}>✨</div>
                    <h2 className={styles.endTitle}>That's My Journey</h2>
                    <p className={styles.endText}>
                        {calculateYearsInIndustry(workHistory)}+ years evolving from hands-on testing through automation architecture
                        to engineering leadership, driving quality excellence and team success.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ScrollExperience;

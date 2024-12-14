import React, { useState, useRef, useEffect } from 'react';
import { WorkHistory } from './profile';
import { getWorkExperienceStyles } from '../styles/pageStyles';
import { useTheme } from '../context/ThemeContext';
import { calculateYears, formatDuration, calculateCompanyTotalYears } from '../utils/dateUtils';
import { useWindowSize } from '../hooks/useWindowSize';

interface AccordionProps {
  workHistory: WorkHistory[];
}

const Accordion: React.FC<AccordionProps> = ({ workHistory }) => {
  const { colors } = useTheme();
  const { isMobile } = useWindowSize();
  const workExperienceStyles = getWorkExperienceStyles(colors);
  const [expandedIndices, setExpandedIndices] = useState<number[]>([0]); // Changed from [] to [0]
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hasOverflow, setHasOverflow] = useState<boolean[]>([]);

  useEffect(() => {
    const newHasOverflow = contentRefs.current.map(
      (ref) => ref ? ref.scrollHeight > 200 : false
    );
    setHasOverflow(newHasOverflow);
  }, [workHistory]);

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

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

  const containerStyles = {
    padding: isMobile ? "1rem" : "1.5rem",
    backgroundColor: colors.containerBg,
    transition: "all 0.2s ease",
  };

  return (
    <div style={containerStyles}>
      {groupedWorkHistory.map((group, groupIndex) => (
        <div
          key={group.company}
          style={{
            marginBottom: '2rem',
            backgroundColor: colors.containerBg,
            borderRadius: '16px',
            boxShadow: colors.shadow,
          }}
        >
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: `2px solid ${colors.accent}`,
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              fontSize: '1.6rem',
              color: colors.text,
              margin: 0,
            }}>{group.company}</h2>
            <div style={{
              color: colors.tertiaryText,
              fontSize: '1rem',
              fontStyle: 'italic'
            }}>
              {calculateCompanyTotalYears(group.positions)} total
            </div>
          </div>
          {group.positions.map((position, posIndex) => {
            const fullIndex = workHistory.findIndex(w => w === position);
            const isExpanded = expandedIndices.includes(fullIndex);
            
            return (
              <div
                key={position.role}
                style={{
                  borderLeft: `4px solid ${colors.accent}`,
                  marginLeft: '1rem',
                  cursor: 'pointer', // Add cursor pointer to indicate clickable area
                }}
                onClick={() => toggleExpand(fullIndex)} // Move click handler here
              >
                <div
                  style={{
                    ...workExperienceStyles.workContainer,
                    padding: isMobile ? "1rem" : "1.5rem",
                    borderRadius: 0,
                    paddingLeft: '2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h3 style={workExperienceStyles.role}>{position.role}</h3>
                    <div style={workExperienceStyles.duration}>
                      {position.duration} • {formatDuration(calculateYears(position.duration))}
                    </div>
                  </div>
                </div>
                <div style={{
                  position: 'relative',
                  paddingLeft: '2.5rem',
                }}>
                  <div 
                    ref={el => contentRefs.current[fullIndex] = el}
                    style={{
                      ...(isExpanded ? workExperienceStyles.expandedContent : workExperienceStyles.previewContent),
                      opacity: 1,
                      maxHeight: isExpanded ? 'none' : '200px',
                    }}
                  >
                    <ul style={workExperienceStyles.description}>
                      {position.description.map((item, i) => (
                        <li key={i} style={workExperienceStyles.descriptionItem}>
                          {item.description}
                          {item.moreInfo && (
                            <ul>
                              {item.moreInfo.map((info, j) => (
                                <li key={j} style={workExperienceStyles.subDescriptionItem}>
                                  {info}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {!isExpanded && hasOverflow[fullIndex] && (
                    <>
                      <div style={workExperienceStyles.gradientOverlay} />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        padding: '2rem 0 1rem 0',
                        color: colors.accent,
                        fontSize: '0.9rem',
                        fontStyle: 'italic',
                        cursor: 'pointer',
                        background: 'transparent',
                        pointerEvents: 'none',
                      }}>
                        Show more ↓
                      </div>
                    </>
                  )}
                  {isExpanded && hasOverflow[fullIndex] && (
                    <div style={{
                      textAlign: 'center',
                      marginTop: '2rem',
                      marginBottom: '1rem',
                      color: colors.accent,
                      fontSize: '0.9rem',
                      fontStyle: 'italic',
                      cursor: 'pointer',
                    }}>
                      Show less ↑
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Accordion;

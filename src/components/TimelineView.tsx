import React, { useState } from 'react';
import { WorkHistory } from '../data/profileData';
import { calculateYears, formatDuration, calculateCompanyTotalYears } from '../utils/dateUtils';
import * as styles from './TimelineView.module.css';

interface TimelineViewProps {
    workHistory: WorkHistory[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ workHistory }) => {
    const [selectedPosition, setSelectedPosition] = useState<WorkHistory | null>(null);
    const [clickedCardRect, setClickedCardRect] = useState<DOMRect | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

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

    const handleCardClick = (position: WorkHistory, event: React.MouseEvent<HTMLDivElement>) => {
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        setClickedCardRect(rect);
        setIsAnimating(true);
        setSelectedPosition(position);
    };

    const handleClosePanel = () => {
        setIsAnimating(false);
        setTimeout(() => {
            setSelectedPosition(null);
            setClickedCardRect(null);
        }, 300);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClosePanel();
        }
    };

    // Keyboard support for ESC key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selectedPosition) {
                handleClosePanel();
            }
        };

        if (selectedPosition) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [selectedPosition]);

    return (
        <>
            <div className={styles.timelineContainer}>
                {groupedWorkHistory.map((group) => (
                    <div key={group.company} className={styles.companyGroup}>
                        <div className={styles.companyHeader}>
                            <div className={styles.companyInfo}>
                                <div className={styles.companyTitleWrapper}>
                                    <h2 className={styles.companyName}>{group.company}</h2>
                                    {group.positions.length > 1 && (
                                        <span className={styles.multiPositionBadge}>
                                            {group.positions.length} Roles
                                        </span>
                                    )}
                                </div>
                                <div className={styles.companyMeta}>
                                    <span className={styles.totalDuration}>
                                        {calculateCompanyTotalYears(group.positions)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.positionsTimeline}>
                            {group.positions.map((position, posIndex) => (
                                <div key={posIndex} className={styles.timelineItem}>
                                    <div className={styles.timelineMarker}>
                                        <div className={styles.timelineDot} />
                                        {posIndex < group.positions.length - 1 && (
                                            <div className={styles.timelineLine} />
                                        )}
                                    </div>

                                    <div
                                        className={styles.positionCard}
                                        onClick={(e) => handleCardClick(position, e)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleCardClick(position, e as any);
                                            }
                                        }}
                                        aria-label={`View details for ${position.role}`}
                                    >
                                        {group.positions.length > 1 && (
                                            <div className={styles.positionNumber}>
                                                Role {posIndex + 1} of {group.positions.length}
                                            </div>
                                        )}
                                        <div className={styles.cardHeader}>
                                            <h3 className={styles.positionRole}>{position.role}</h3>
                                            <div className={styles.viewDetailsIcon}>
                                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M7 10l5 5 5-5H7z" />
                                                </svg>
                                            </div>
                                        </div>

                                        <div className={styles.cardMeta}>
                                            <span className={styles.duration}>{position.duration}</span>
                                            <span className={styles.separator}>•</span>
                                            <span className={styles.durationYears}>
                                                {formatDuration(calculateYears(position.duration))}
                                            </span>
                                        </div>

                                        <div className={styles.cardPreview}>
                                            <ul className={styles.previewList}>
                                                {position.description.slice(0, 3).map((item, i) => (
                                                    <li key={i}>{item.description}</li>
                                                ))}
                                            </ul>
                                            {position.description.length > 3 && (
                                                <div className={styles.moreIndicator}>
                                                    +{position.description.length - 3} more areas
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.cardFooter}>
                                            <span className={styles.clickPrompt}>Click to view details</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Side Panel */}
            {selectedPosition && (
                <>
                    <div
                        className={`${styles.backdrop} ${isAnimating ? styles.backdropVisible : styles.backdropHidden}`}
                        onClick={handleBackdropClick}
                    />

                    {/* Connection indicator from card to panel */}
                    {clickedCardRect && (
                        <div
                            className={styles.connectionLine}
                            style={{
                                top: `${clickedCardRect.top + clickedCardRect.height / 2}px`,
                                left: `${clickedCardRect.right}px`,
                            }}
                        />
                    )}

                    <div
                        className={`${styles.sidePanel} ${isAnimating ? styles.sidePanelVisible : styles.sidePanelHidden}`}
                        style={{
                            transformOrigin: clickedCardRect
                                ? `left ${clickedCardRect.top + clickedCardRect.height / 2}px`
                                : 'left center'
                        }}
                    >
                        <div className={styles.panelHeader}>
                            <div>
                                <h2 className={styles.panelRole}>{selectedPosition.role}</h2>
                                <p className={styles.panelCompany}>{selectedPosition.company}</p>
                                <div className={styles.panelMeta}>
                                    <span>{selectedPosition.duration}</span>
                                    <span className={styles.separator}>•</span>
                                    <span>{formatDuration(calculateYears(selectedPosition.duration))}</span>
                                </div>
                            </div>
                            <button
                                className={styles.closeButton}
                                onClick={handleClosePanel}
                                aria-label="Close panel"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className={styles.panelContent}>
                            {selectedPosition.description.map((item, i) => (
                                <div key={i} className={styles.detailSection}>
                                    <h3 className={styles.sectionTitle}>{item.description}</h3>
                                    {item.moreInfo && (
                                        <ul className={styles.detailList}>
                                            {item.moreInfo.map((info, j) => (
                                                <li key={j} className={styles.detailItem}>{info}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default TimelineView;

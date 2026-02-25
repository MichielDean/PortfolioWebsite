import { render, screen } from '@testing-library/react';
import ScrollExperience from '../../components/ScrollExperience';
import { ThemeProvider } from '../../context/ThemeContext';
import { profileData } from '../../data/profileData';

const renderScrollExperience = (viewportWidth = 1280) => {
  // Mock innerWidth so jsdom behaves like the target viewport
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: viewportWidth,
  });

  return render(
    <ThemeProvider>
      <ScrollExperience workHistory={profileData.workHistory} />
    </ThemeProvider>
  );
};

describe('ScrollExperience', () => {
  afterEach(() => {
    // Restore default desktop width after each test
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  describe('renders without crashing', () => {
    it('renders on desktop viewport (1280px)', () => {
      renderScrollExperience(1280);
      expect(screen.getByText('Building')).toBeInTheDocument();
    });

    it('renders on tablet viewport (768px)', () => {
      renderScrollExperience(768);
      expect(screen.getByText('Building')).toBeInTheDocument();
    });

    it('renders on mobile viewport - Pixel 6 Pro (412px)', () => {
      renderScrollExperience(412);
      expect(screen.getByText('Building')).toBeInTheDocument();
    });

    it('renders on small mobile viewport (320px)', () => {
      renderScrollExperience(320);
      expect(screen.getByText('Building')).toBeInTheDocument();
    });
  });

  describe('hero section content', () => {
    it('renders the hero title lines', () => {
      renderScrollExperience(412);
      expect(screen.getByText('Building')).toBeInTheDocument();
      expect(screen.getByText('High-Performing')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
    });

    it('renders hero stats', () => {
      renderScrollExperience(412);
      // Use getAllByText since some stat labels may also appear in achievement cards
      expect(screen.getAllByText('Leadership').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Architecture').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mentorship').length).toBeGreaterThan(0);
    });

    it('renders scroll indicator', () => {
      renderScrollExperience(412);
      expect(screen.getByText('Scroll to explore my journey')).toBeInTheDocument();
    });
  });

  describe('work history rendering', () => {
    it('renders work history company names', () => {
      renderScrollExperience(412);
      // Each company should appear at least once in the document
      const companies = [...new Set(profileData.workHistory.map(w => w.company))];
      companies.forEach(company => {
        expect(screen.getAllByText(company).length).toBeGreaterThan(0);
      });
    });

    it('renders role titles', () => {
      renderScrollExperience(412);
      // Role titles appear in the heroLabel and as h2 — use getAllByText to handle duplicates
      profileData.workHistory.forEach(position => {
        expect(screen.getAllByText(position.role).length).toBeGreaterThan(0);
      });
    });
  });

  describe('connect section', () => {
    it("renders the Let's Connect heading", () => {
      renderScrollExperience(412);
      expect(screen.getByText("Let's Connect")).toBeInTheDocument();
    });

    it('renders social links', () => {
      renderScrollExperience(412);
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Stack Overflow')).toBeInTheDocument();
    });

    it('LinkedIn link has correct href', () => {
      renderScrollExperience(412);
      const linkedinLink = screen.getByRole('link', { name: /linkedin/i });
      expect(linkedinLink).toHaveAttribute('href', profileData.linkedin);
    });

    it('GitHub link has correct href', () => {
      renderScrollExperience(412);
      const githubLink = screen.getByRole('link', { name: /github/i });
      expect(githubLink).toHaveAttribute('href', profileData.github);
    });
  });

  describe('no fixed widths wider than typical mobile viewport', () => {
    it('heroStats container does not set a fixed pixel width wider than 480px via inline styles', () => {
      const { container } = renderScrollExperience(412);
      // All elements with inline width styles should not exceed the viewport
      const elementsWithStyle = container.querySelectorAll('[style]');
      elementsWithStyle.forEach(el => {
        const inlineWidth = (el as HTMLElement).style.width;
        if (inlineWidth && inlineWidth.endsWith('px')) {
          const widthPx = parseFloat(inlineWidth);
          expect(widthPx).toBeLessThanOrEqual(window.innerWidth);
        }
      });
    });
  });

  describe('snapshot', () => {
    it('matches snapshot at desktop viewport', () => {
      const { container } = renderScrollExperience(1280);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot at mobile viewport (Pixel 6 Pro)', () => {
      const { container } = renderScrollExperience(412);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});

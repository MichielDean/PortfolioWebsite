import { render, screen } from '@testing-library/react';
import AboutMe from '../../components/AboutMe';
import { ThemeProvider } from '../../context/ThemeContext';
import { profileData } from '../../data/profileData';

describe('AboutMe', () => {
  const renderAboutMe = () => {
    return render(
      <ThemeProvider>
        <AboutMe />
      </ThemeProvider>
    );
  };

  it('renders the About Me heading', () => {
    renderAboutMe();
    expect(screen.getByText('About Me')).toBeInTheDocument();
  });

  it('renders social media links', () => {
    renderAboutMe();
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', profileData.linkedin);
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', profileData.github);
    expect(screen.getByRole('link', { name: 'Stack Overflow' })).toHaveAttribute('href', profileData.stackOverflow);
  });

  it('renders the profile image', () => {
    renderAboutMe();
    expect(screen.getByAltText('Michiel Bugher')).toBeInTheDocument();
  });
});

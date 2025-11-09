import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../../components/ThemeToggle';
import { ThemeProvider } from '../../context/ThemeContext';

describe('ThemeToggle', () => {
    const renderThemeToggle = () => {
        return render(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>
        );
    };

    it('renders the theme toggle button', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
    });

    it('displays correct initial theme (dark mode)', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');

        // Initial theme is dark, so button should say "Light" (to switch to light)
        expect(button).toHaveTextContent('Light');
        expect(button).toHaveTextContent('☀️');
    });

    it('has correct aria-label for accessibility', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('toggles theme when clicked', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');

        // Initially shows "Light" (dark mode active)
        expect(button).toHaveTextContent('Light');
        expect(button).toHaveTextContent('☀️');

        // Click to toggle to light mode
        fireEvent.click(button);

        // Now should show "Dark" (light mode active)
        expect(button).toHaveTextContent('Dark');
        expect(button).toHaveTextContent('🌙');
        expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('toggles back and forth multiple times', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');

        // Initial state - dark mode
        expect(button).toHaveTextContent('Light');

        // Click 1: Switch to light
        fireEvent.click(button);
        expect(button).toHaveTextContent('Dark');

        // Click 2: Switch back to dark
        fireEvent.click(button);
        expect(button).toHaveTextContent('Light');

        // Click 3: Switch to light again
        fireEvent.click(button);
        expect(button).toHaveTextContent('Dark');
    });

    it('displays correct icon for dark mode', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');

        // Dark mode shows sun icon
        expect(button).toHaveTextContent('☀️');
    });

    it('displays correct icon for light mode', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');

        // Switch to light mode
        fireEvent.click(button);

        // Light mode shows moon icon
        expect(button).toHaveTextContent('🌙');
    });

    it('updates aria-label when theme changes', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');

        // Initial aria-label
        expect(button).toHaveAttribute('aria-label', 'Switch to light mode');

        // Toggle theme
        fireEvent.click(button);

        // Updated aria-label
        expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');

        // Toggle again
        fireEvent.click(button);

        // Back to original
        expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('maintains consistent icon and text relationship', () => {
        renderThemeToggle();
        const button = screen.getByRole('button');

        // In dark mode: shows sun icon with "Light" text
        expect(button).toHaveTextContent('☀️');
        expect(button).toHaveTextContent('Light');

        fireEvent.click(button);

        // In light mode: shows moon icon with "Dark" text
        expect(button).toHaveTextContent('🌙');
        expect(button).toHaveTextContent('Dark');
    });
});

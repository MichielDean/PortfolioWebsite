import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { ThemeMode } from '../../types/themeTypes';

// Test component to access context
const TestComponent: React.FC = () => {
    const { theme, colors, toggleTheme } = useTheme();
    return (
        <div>
            <div data-testid="current-theme">{theme}</div>
            <div data-testid="background-color">{colors.background}</div>
            <div data-testid="text-color">{colors.text}</div>
            <button onClick={toggleTheme} data-testid="toggle-button">
                Toggle Theme
            </button>
        </div>
    );
};

describe('ThemeContext', () => {
    describe('ThemeProvider', () => {
        it('provides default dark theme', () => {
            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            expect(screen.getByTestId('current-theme')).toHaveTextContent(ThemeMode.Dark);
            expect(screen.getByTestId('background-color')).toHaveTextContent('#0F172A');
            expect(screen.getByTestId('text-color')).toHaveTextContent('#F8FAFC');
        });

        it('toggles theme from dark to light', () => {
            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            const toggleButton = screen.getByTestId('toggle-button');

            // Initially dark
            expect(screen.getByTestId('current-theme')).toHaveTextContent(ThemeMode.Dark);

            // Toggle to light
            fireEvent.click(toggleButton);
            expect(screen.getByTestId('current-theme')).toHaveTextContent(ThemeMode.Light);
            expect(screen.getByTestId('background-color')).toHaveTextContent('#F8FAFC');
            expect(screen.getByTestId('text-color')).toHaveTextContent('#111827');
        });

        it('toggles theme from light to dark', () => {
            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            const toggleButton = screen.getByTestId('toggle-button');

            // Toggle to light
            fireEvent.click(toggleButton);
            expect(screen.getByTestId('current-theme')).toHaveTextContent(ThemeMode.Light);

            // Toggle back to dark
            fireEvent.click(toggleButton);
            expect(screen.getByTestId('current-theme')).toHaveTextContent(ThemeMode.Dark);
            expect(screen.getByTestId('background-color')).toHaveTextContent('#0F172A');
        });

        it('applies CSS variables to document root on mount', () => {
            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            const root = document.documentElement;
            expect(root.style.getPropertyValue('--background')).toBe('#0F172A');
            expect(root.style.getPropertyValue('--text')).toBe('#F8FAFC');
            expect(root.style.getPropertyValue('--accent')).toBe('#06B6D4');
            expect(root.style.getPropertyValue('--container-bg')).toBe('#1E293B');
        });

        it('updates CSS variables when theme changes', () => {
            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            const toggleButton = screen.getByTestId('toggle-button');
            const root = document.documentElement;

            // Check dark theme variables
            expect(root.style.getPropertyValue('--background')).toBe('#0F172A');

            // Toggle to light
            fireEvent.click(toggleButton);

            // Check light theme variables
            expect(root.style.getPropertyValue('--background')).toBe('#F8FAFC');
            expect(root.style.getPropertyValue('--text')).toBe('#111827');
            expect(root.style.getPropertyValue('--accent')).toBe('#2563EB');
        });

        it('applies background color to body element', () => {
            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            const body = document.body;
            // backgroundColor is returned in rgb format by the browser
            expect(body.style.backgroundColor).toBe('rgb(15, 23, 42)');
            expect(body.style.color).toBe('rgb(248, 250, 252)');
        });

        it('creates alpha variant CSS variables', () => {
            render(
                <ThemeProvider>
                    <TestComponent />
                </ThemeProvider>
            );

            const root = document.documentElement;
            expect(root.style.getPropertyValue('--accent-alpha-05')).toContain('#06B6D4');
            expect(root.style.getPropertyValue('--accent-alpha-10')).toContain('#06B6D4');
            expect(root.style.getPropertyValue('--text-alpha-80')).toContain('#F8FAFC');
            expect(root.style.getPropertyValue('--container-bg-dd')).toContain('#1E293B');
        });

        it('provides all theme colors', () => {
            const ColorTestComponent: React.FC = () => {
                const { colors } = useTheme();
                return (
                    <div>
                        <div data-testid="background">{colors.background}</div>
                        <div data-testid="text">{colors.text}</div>
                        <div data-testid="secondary-text">{colors.secondaryText}</div>
                        <div data-testid="tertiary-text">{colors.tertiaryText}</div>
                        <div data-testid="accent">{colors.accent}</div>
                        <div data-testid="container-bg">{colors.containerBg}</div>
                        <div data-testid="shadow">{colors.shadow}</div>
                        <div data-testid="shadow-hover">{colors.shadowHover}</div>
                        <div data-testid="border">{colors.border}</div>
                    </div>
                );
            };

            render(
                <ThemeProvider>
                    <ColorTestComponent />
                </ThemeProvider>
            );

            // Verify all color properties are available
            expect(screen.getByTestId('background')).toBeInTheDocument();
            expect(screen.getByTestId('text')).toBeInTheDocument();
            expect(screen.getByTestId('secondary-text')).toBeInTheDocument();
            expect(screen.getByTestId('tertiary-text')).toBeInTheDocument();
            expect(screen.getByTestId('accent')).toBeInTheDocument();
            expect(screen.getByTestId('container-bg')).toBeInTheDocument();
            expect(screen.getByTestId('shadow')).toBeInTheDocument();
            expect(screen.getByTestId('shadow-hover')).toBeInTheDocument();
            expect(screen.getByTestId('border')).toBeInTheDocument();
        });
    });

    describe('useTheme hook', () => {
        it('works with default context value when used outside ThemeProvider', () => {
            // Note: The context provides a default value, so it doesn't throw
            // This tests that the default context is available
            const ComponentWithoutProvider: React.FC = () => {
                const { theme, colors } = useTheme();
                return (
                    <div>
                        <div data-testid="theme-value">{theme}</div>
                        <div data-testid="background-value">{colors.background}</div>
                    </div>
                );
            };

            render(<ComponentWithoutProvider />);

            // Should use default dark theme values
            expect(screen.getByTestId('theme-value')).toHaveTextContent(ThemeMode.Dark);
            expect(screen.getByTestId('background-value')).toHaveTextContent('#0F172A');
        });
    });
});

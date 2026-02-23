import React from 'react';

/**
 * GlassCard - A reusable glassmorphism card component
 * Features frosted glass effect with backdrop blur, semi-transparent background,
 * and optional orange glow effect
 */
const GlassCard = ({
    children,
    className = '',
    glowColor = 'orange',
    withGlow = false,
    onClick,
    ...props
}) => {
    const baseClasses = withGlow ? 'glass-card-glow' : 'glass-card';

    const glowStyles = withGlow && glowColor !== 'orange' ? {
        boxShadow: `
      0 0 20px ${glowColor}33,
      0 8px 32px 0 ${glowColor}26,
      0 0 1px 0 rgba(255, 255, 255, 0.2) inset
    `
    } : {};

    return (
        <div
            className={`${baseClasses} ${className}`}
            style={glowStyles}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};



export default GlassCard;

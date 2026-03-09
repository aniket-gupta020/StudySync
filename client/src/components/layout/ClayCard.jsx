import React from 'react';

/**
 * ClayCard - A reusable glassmorphism card component
 * Features frosted clay effect with backdrop blur, semi-transparent background,
 * and optional orange glow effect
 */
const ClayCard = ({
    children,
    className = '',
    glowColor = 'orange',
    withGlow = false,
    onClick,
    ...props
}) => {
    const baseClasses = withGlow ? 'clay-card-glow' : 'clay-card';

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



export default ClayCard;

'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
}

export default function AnimatedButton({
    children,
    onClick,
    className = '',
    variant = 'primary',
    disabled = false,
    type = 'button',
}: AnimatedButtonProps) {
    const baseStyles = 'relative overflow-hidden font-semibold transition-colors';

    const variants = {
        primary: 'bg-accent text-white hover:bg-accent-light',
        secondary: 'glass text-text-primary hover:border-accent',
        ghost: 'bg-transparent text-text-secondary hover:text-accent',
    };

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${className}`}
            
            
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {/* Hover glow effect */}
            <motion.span
                className="absolute inset-0 bg-white/20 rounded-lg"
                initial={{ opacity: 0 }}
                
                transition={{ duration: 0.3 }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </span>
        </motion.button>
    );
}

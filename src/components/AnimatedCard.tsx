'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    hoverLift?: boolean;
    borderColor?: string;
}

export default function AnimatedCard({
    children,
    className = '',
    delay = 0,
    hoverLift = true,
    borderColor,
}: AnimatedCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
                duration: 0.5,
                delay,
                ease: [0.25, 0.1, 0.25, 1],
            }}

            className={`glass rounded-xl transition-colors ${borderColor ? `border-l-4 ${borderColor}` : ''} ${className}`}
        >
            {children}
        </motion.div>
    );
}

import React from 'react';
import { motion, type Variants } from 'framer-motion';

const staggerVariants: Variants = {
  hidden: {},
  show: (delay: number | undefined) => ({
    transition: {
      staggerChildren: 0.07,
      delayChildren: delay ?? 0.02,
    },
  }),
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  },
};

interface StaggerProps {
  as?: 'div' | 'ul';
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const Stagger: React.FC<StaggerProps> = ({
  as = 'div',
  className,
  children,
  delay,
}) => {
  const Component = as === 'ul' ? motion.ul : motion.div;

  return (
    <Component
      className={className}
      variants={staggerVariants}
      custom={delay}
      initial="hidden"
      animate="show"
    >
      {children}
    </Component>
  );
};

interface StaggerItemProps {
  as?: 'div' | 'li' | 'section';
  className?: string;
  children: React.ReactNode;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  as = 'div',
  className,
  children,
}) => {
  const Component = as === 'li' ? motion.li : as === 'section' ? motion.section : motion.div;

  return (
    <Component className={className} variants={staggerItemVariants}>
      {children}
    </Component>
  );
};

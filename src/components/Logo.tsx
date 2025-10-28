import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-20 h-12',
  md: 'w-28 h-16',
  lg: 'w-40 h-24',
  xl: 'w-48 h-28',
  xxl: 'w-64 h-36',
};

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const { theme } = useTheme();
  const currentSizeClass = sizeClasses[size];
  const isLight = theme === 'light';

  // Choose best image for theme
  const src = isLight
    ? '/transparent-background-with-black-text.png'
    : '/transparent-background-with-white-text.png';

  return (
    <div className={`flex items-center justify-center ${currentSizeClass} ${className}`}>
      <Image
        src={src}
        alt="Indus Labs"
        width={480}
        height={120}
        className="h-full w-auto object-contain drop-shadow-xl"
        priority
      />
    </div>
  );
};

export default Logo;
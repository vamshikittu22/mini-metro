import React from 'react';

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const BaseButton: React.FC<BaseButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  active = false,
  className = '',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-black uppercase tracking-widest transition-all select-none rounded-sm';
  
  const variants = {
    primary: 'bg-[#2F3436] text-[#F8F4EE] hover:bg-black',
    secondary: 'bg-black/5 text-black hover:bg-black/10 border border-black/5',
    ghost: 'text-black/30 hover:text-black transition-colors',
    danger: 'text-red-500 hover:bg-red-500 hover:text-white',
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-[9px]',
    md: 'px-8 py-3 text-[10px]',
    lg: 'px-16 py-6 text-sm',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
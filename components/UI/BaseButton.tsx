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
  const baseStyles = 'inline-flex items-center justify-center font-black uppercase tracking-widest transition-all rounded-full select-none';
  
  const variants = {
    primary: 'bg-[#2F3436] text-white hover:bg-black shadow-lg',
    secondary: 'bg-white/60 text-[#2F3436]/60 border border-black/5 hover:text-[#2F3436] hover:bg-white/80',
    ghost: 'text-[#2F3436]/40 hover:text-[#2F3436] transition-colors',
    danger: 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500 hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1 text-[9px]',
    md: 'px-6 py-2 text-[10px]',
    lg: 'px-12 py-4 text-sm',
  };

  const activeStyles = active ? 'bg-[#2F3436] text-white' : '';

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${activeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
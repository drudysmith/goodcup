interface HeaderStyleOptions {
  isScrolled: boolean;
  isScrolledAndNarrow: boolean;
}

export const getHeaderTextClasses = (options: HeaderStyleOptions) => {
  const { isScrolled, isScrolledAndNarrow } = options;
  
  return {
    // Logo text size
    logoSize: isScrolled ? 'text-3xl' : 'text-4xl',
    
    // Navigation text size
    navSize: isScrolled ? 'text-sm' : 'text-base',
    
    // Text color based on scroll state
    textColor: isScrolledAndNarrow ? 'text-surface-background' : 'text-neutral-border',
    
    // Icon size
    iconSize: isScrolled ? 'w-9 h-9' : 'w-10 h-10',
  };
}; 

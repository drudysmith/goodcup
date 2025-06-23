import React from 'react';

interface NavLink {
  name: string;
  href: string;
}

interface NavMenuProps {
  menuOpen: boolean;
  menuClosing: boolean;
  navLinks: NavLink[];
  showBanner: boolean;
  isScrolled: boolean;
}

const NavMenu: React.FC<NavMenuProps> = ({ 
  menuOpen, 
  menuClosing, 
  navLinks, 
  showBanner, 
  isScrolled 
}) => {
  if (!menuOpen && !menuClosing) return null;

  return (
    <ul 
      className={`fixed left-0 w-full shadow-md flex flex-col items-center justify-center py-6 gap-y-6 z-20 transition-all duration-300 bg-neutral-border/65 backdrop-blur-sm ${
        menuClosing ? 'animate-slide-up' : 'animate-slide-down'
      }`}
      style={{ top: showBanner ? (isScrolled ? '6.9rem' : '7.125rem') : (isScrolled ? '5.525rem' : '6.125rem') }}
    >
      {navLinks.map((link) => (
        <li key={link.name}>
          <a
            href={link.href}
            className="dropdown-item text-lg font-medium transition-all duration-500 text-surface-background uppercase"
          >
            <span>{link.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
};

export default NavMenu; 
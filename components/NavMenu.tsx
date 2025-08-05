import React from 'react';
import Link from 'next/link';

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

const NavMenu = React.forwardRef<HTMLUListElement, NavMenuProps>(
  ({ menuOpen, menuClosing, navLinks, showBanner, isScrolled }, ref) => {
  if (!menuOpen && !menuClosing) return null;

  return (
    <ul 
        ref={ref}
      className={`fixed left-0 w-full shadow-md flex flex-col items-center justify-center py-6 gap-y-6 z-20 transition-all duration-300 bg-neutral-border/65 backdrop-blur-sm ${
        menuClosing ? 'animate-slide-up' : 'animate-slide-down'
      }`}
      style={{ top: showBanner ? (isScrolled ? '6.9rem' : '7.125rem') : (isScrolled ? '5.525rem' : '6.125rem') }}
    >
      {navLinks.map((link) => (
        <li key={link.name}>
            <Link href={link.href} legacyBehavior>
              <a className="dropdown-item text-lg font-medium transition-all duration-500 text-surface-background uppercase">
            <span>{link.name}</span>
          </a>
            </Link>
        </li>
      ))}
    </ul>
  );
  }
);

export default NavMenu; 

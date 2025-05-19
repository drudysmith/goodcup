import React, { ReactNode, useState, useEffect, useRef } from 'react';

interface LayoutProps {
  children: ReactNode;
  overlay?: ReactNode;
}

const navLinks = [
  { name: 'Services', href: '#' },
  { name: 'AI Mentor', href: '#' },
];

const Layout: React.FC<LayoutProps> = ({ children, overlay }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const toggleMenu = () => setMenuOpen((open) => !open);
  const closeMenu = () => setMenuOpen(false);

  // Handle banner visibility with localStorage and expiration
  useEffect(() => {
    const checkBannerDismissed = () => {
      const dismissedTime = localStorage.getItem('bannerDismissedAt');
      
      if (!dismissedTime) {
        setShowBanner(true);
        return;
      }
      
      // Check if 3 days have passed since dismissal
      const dismissedDate = new Date(dismissedTime);
      const currentDate = new Date();
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      
      if (currentDate.getTime() - dismissedDate.getTime() > threeDaysInMs) {
        // 3 days have passed, show the banner again
        localStorage.removeItem('bannerDismissedAt');
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    };
    
    checkBannerDismissed();
    
    // Add reset function for developers
    window.resetNotificationBanner = () => {
      localStorage.removeItem('bannerDismissedAt');
      setShowBanner(true);
      console.log('Notification banner has been reset');
    };
    
    return () => {
      // Clean up the global function when component unmounts
      delete window.resetNotificationBanner;
    };
  }, []);

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('bannerDismissedAt', new Date().toISOString());
  };

  // Add scroll detection effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Add click outside effect to close menu
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) && 
        menuButtonRef.current && 
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#dfe0df] font-['Roboto','Poppins',sans-serif]">
      {/* Notification Banner */}
      {showBanner && (
        <div 
          className="fixed top-0 left-0 w-full bg-[#565e77] bg-opacity-30 text-white z-30 flex items-center justify-between px-4 py-3 transition-all duration-300 ease-in-out backdrop-blur-sm animate-slide-down"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <p className="text-sm md:text-base font-medium mx-auto pr-10">
            Now booking sessions for summer 2025! Limited slots available.
          </p>
          <button 
            onClick={dismissBanner}
            className="absolute right-4 text-white hover:text-[#dfe0df] transition-colors"
            aria-label="Dismiss notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Fixed Header with scroll animation */}
      <header 
        className={`fixed ${showBanner ? 'top-[41px]' : 'top-0'} left-0 w-full border-b border-[#565e77] flex items-center justify-center z-20 transition-all duration-300 ease-in-out bg-transparent ${
          isScrolled ? 'h-[3.6rem]' : 'h-[4rem]'
        }`}
      >
        <nav className={`w-full max-w-5xl flex items-center justify-between px-4 transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-0'
        }`}>
          <span className={`font-bold text-[#565e77] transition-all duration-300 ${
            isScrolled ? 'text-base' : 'text-lg'
          }`}>Header (Fixed)</span>
          {/* Desktop Nav */}
          <ul className="hidden md:flex gap-x-6">
            {navLinks.map((link) => (
              <li key={link.name}>
                <a href={link.href} className={`text-[#565e77] font-medium hover:underline transition-all duration-300 ${
                  isScrolled ? 'text-sm' : 'text-base'
                }`}>
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
          {/* Mobile Hamburger */}
          <button
            ref={menuButtonRef}
            className={`md:hidden flex flex-col justify-center items-center relative z-30 transition-all duration-300 ${
              isScrolled ? 'w-9 h-9' : 'w-10 h-10'
            }`}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={toggleMenu}
          >
            <span
              className={`block w-6 h-0.5 bg-[#565e77] transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#565e77] my-1 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#565e77] transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}
            />
          </button>
          {/* Mobile Menu Dropdown */}
          {menuOpen && (
            <ul 
              ref={menuRef}
              className={`absolute left-0 w-full border-t border-[#565e77] shadow-md flex flex-col items-center py-4 gap-y-4 md:hidden animate-fade-in z-20 transition-all duration-300 ${
                isScrolled ? 'top-[3.6rem]' : 'top-[4rem]'
              }`}
              style={{ backgroundColor: 'rgba(223, 224, 223, 0.7)', backdropFilter: 'blur(4px)' }}
            >
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-[#565e77] text-lg font-medium hover:underline"
                    onClick={closeMenu}
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </header>

      {/* Main Content Area - adjust padding-top based on header size and banner visibility */}
      <main className={`flex-1 w-full px-0 pb-16 bg-[#dfe0df] transition-all duration-300 ${
        showBanner 
          ? (isScrolled ? 'pt-[6.5rem]' : 'pt-[7rem]') 
          : (isScrolled ? 'pt-[4.5rem]' : 'pt-[5rem]')
      }`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full h-12 bg-[#dfe0df] border-t border-[#565e77] flex items-center justify-center z-10">
        <span className="text-sm text-[#565e77]">Footer (Fixed)</span>
        {/* Developer reset button, subtle and unobtrusive */}
        <button 
          onClick={() => window.resetNotificationBanner?.()}
          className="absolute right-4 text-[#565e77] opacity-30 hover:opacity-100 text-xs"
          aria-label="Reset notification banner (developer only)"
        >
          Reset Banner
        </button>
      </footer>

      {/* Overlay/Modal Placeholder */}
      {overlay && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-30">
          {overlay}
        </div>
      )}
    </div>
  );
};

// Add global type for notification banner reset function
declare global {
  interface Window {
    resetNotificationBanner?: () => void;
  }
}

export default Layout; 
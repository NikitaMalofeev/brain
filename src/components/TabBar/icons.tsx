import { FC } from 'react';

interface IconProps {
  isActive: boolean;
}

export const HomeIcon: FC<IconProps> = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M3 10.182V21.5H9.273V15.227H14.727V21.5H21V10.182L12 3L3 10.182Z" 
      fill={isActive ? "var(--tgui-accent)" : "none"}
      stroke={isActive ? "var(--tgui-accent)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LibraryIcon: FC<IconProps> = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M4 19.5V4.5C4 4.23478 4.10536 3.98043 4.29289 3.79289C4.48043 3.60536 4.73478 3.5 5 3.5H19C19.2652 3.5 19.5196 3.60536 19.7071 3.79289C19.8946 3.98043 20 4.23478 20 4.5V19.5C20 19.7652 19.8946 20.0196 19.7071 20.2071C19.5196 20.3946 19.2652 20.5 19 20.5H5C4.73478 20.5 4.48043 20.3946 4.29289 20.2071C4.10536 20.0196 4 19.7652 4 19.5Z" 
      fill={isActive ? "var(--tgui-accent)" : "none"}
      stroke={isActive ? "var(--tgui-accent)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M8 8.5H16" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path 
      d="M8 12.5H16" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path 
      d="M8 16.5H12" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const CalendarIcon: FC<IconProps> = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect 
      x="3" 
      y="4" 
      width="18" 
      height="18" 
      rx="2" 
      fill={isActive ? "var(--tgui-accent)" : "none"}
      stroke={isActive ? "var(--tgui-accent)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M16 2V6" 
      stroke={isActive ? "var(--tgui-accent)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M8 2V6" 
      stroke={isActive ? "var(--tgui-accent)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M3 10H21" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M8 14H8.01" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M12 14H12.01" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M16 14H16.01" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M8 18H8.01" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M12 18H12.01" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M16 18H16.01" 
      stroke={isActive ? "var(--tgui-background)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ProfileIcon: FC<IconProps> = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 12C14.4853 12 16.5 9.98528 16.5 7.5C16.5 5.01472 14.4853 3 12 3C9.51472 3 7.5 5.01472 7.5 7.5C7.5 9.98528 9.51472 12 12 12Z" 
      fill={isActive ? "var(--tgui-accent)" : "none"}
      stroke={isActive ? "var(--tgui-accent)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M20.447 21C20.447 17.13 16.684 14 12 14C7.31602 14 3.55302 17.13 3.55302 21" 
      fill={isActive ? "var(--tgui-accent)" : "none"}
      stroke={isActive ? "var(--tgui-accent)" : "var(--tgui-text-secondary)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
); 
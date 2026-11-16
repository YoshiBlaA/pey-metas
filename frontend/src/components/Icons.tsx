// Íconos SVG simples (sin dependencias). aria-hidden porque son decorativos.
type P = { className?: string }
const S = ({ className = 'size-5', children, sw = 2 }: P & { children: React.ReactNode; sw?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {children}
  </svg>
)
export const HeartIcon = ({ className = 'size-5' }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2 0 3.5 1.1 4.3 2.4.8-1.3 2.3-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
)
export const TrophyIcon = (p: P) => <S {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></S>
export const BackIcon = (p: P) => <S {...p} sw={2.2}><path d="M15 18l-6-6 6-6" /></S>
export const UsersIcon = ({ className = 'size-4' }: P) => <S className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></S>
export const CheckIcon = ({ className = 'size-6' }: P) => <S className={className} sw={2.5}><path d="M5 13l4 4L19 7" /></S>
export const ClockIcon = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
export const SearchIcon = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></S>
export const ShareIcon = (p: P) => <S {...p}><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></S>
export const DownloadIcon = (p: P) => <S {...p}><path d="M12 3v13M7 11l5 5 5-5M5 21h14" /></S>
export const RefreshIcon = (p: P) => <S {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" /></S>
export const EyeIcon = (p: P) => <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></S>
export const PencilIcon = (p: P) => <S {...p}><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></S>
export const PlusIcon = (p: P) => <S {...p} sw={2.4}><path d="M12 5v14M5 12h14" /></S>
export const XIcon = (p: P) => <S {...p} sw={2.4}><path d="M6 6l12 12M18 6L6 18" /></S>
export const GridIcon = (p: P) => <S {...p}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></S>
export const LogoutIcon = (p: P) => <S {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></S>
export const ShieldIcon = (p: P) => <S {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></S>
export const MailIcon = (p: P) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></S>
export const LockIcon = (p: P) => <S {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></S>
export const MenuIcon = (p: P) => <S {...p}><path d="M4 6h16M4 12h16M4 18h16" /></S>
export const QrIcon = (p: P) => <S {...p}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2" /></S>
export const PhoneIcon = (p: P) => <S {...p}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></S>
export const InfoIcon = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></S>
export const FileIcon = (p: P) => <S {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5" /></S>
export const UserIcon = (p: P) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>
export const ListIcon = (p: P) => <S {...p}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></S>
export const GearIcon = (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></S>

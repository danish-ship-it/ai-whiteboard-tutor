import type { SVGProps } from "react";

/** Outlined icons on a 24-unit grid, 1.75 strokes, rounded caps and joins (spec §3). */
function Icon({ children, size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement> & { size?: number };

export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
  </Icon>
);
export const PauseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M8 5v14M16 5v14" strokeWidth={2.5} />
  </Icon>
);
export const RestartIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </Icon>
);
export const ReplayIcon = RestartIcon;
export const PrevIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 5v14M18 6l-9 6 9 6V6Z" />
  </Icon>
);
export const NextIcon = (p: P) => (
  <Icon {...p}>
    <path d="M18 5v14M6 6l9 6-9 6V6Z" />
  </Icon>
);
export const CaptionsIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
  </Icon>
);
export const ChevronDown = (p: P) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const ChevronUp = (p: P) => (
  <Icon {...p}>
    <path d="m6 15 6-6 6 6" />
  </Icon>
);
export const ArrowRight = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
export const SendIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Icon>
);
export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </Icon>
);
export const KeyboardIcon = (p: P) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </Icon>
);
export const WarningIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4.5M12 17.5h.01" />
  </Icon>
);
export const ExpandIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Icon>
);
export const ShrinkIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </Icon>
);

/** The Chalk brand mark: a drawn right angle. */
export const DownloadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icon>
);
export const BrandMark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 3.5v15.5h15.5" stroke="var(--action)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 14h5v5" stroke="var(--action)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

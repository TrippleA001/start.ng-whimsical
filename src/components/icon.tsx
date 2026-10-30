import type { ReactNode } from "react";

export type IconName =
  | "grid"
  | "chat"
  | "folder"
  | "spark"
  | "phone"
  | "search"
  | "plus"
  | "smile"
  | "paperclip"
  | "pen"
  | "send"
  | "sound-on"
  | "sound-off"
  | "close"
  | "mic"
  | "mic-off"
  | "camera"
  | "leave"
  | "shield"
  | "arrow"
  | "trash"
  | "command"
  | "thread"
  | "bell"
  | "gear"
  | "reply"
  | "sun"
  | "moon"
  | "monitor";

const paths: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  chat: (
    <path d="M20 14.5a3.5 3.5 0 0 1-3.5 3.5H9l-4 3v-3.6A3.5 3.5 0 0 1 3 14V7a3.5 3.5 0 0 1 3.5-3.5h10A3.5 3.5 0 0 1 20 7v7.5Z" />
  ),
  folder: (
    <path d="M3 8a2 2 0 0 1 2-2h4l2 2.4h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
  ),
  spark: (
    <path d="M12 3c.5 4.4 3.6 7.5 8 8-4.4.5-7.5 3.6-8 8-.5-4.4-3.6-7.5-8-8 4.4-.5 7.5-3.6 8-8Z" />
  ),
  phone: (
    <path d="M6.3 3.5h2.2l1.6 3.8-1.8 1.4a11 11 0 0 0 5.5 5.5l1.4-1.8 3.8 1.6v2.2c0 1.4-1.2 2.4-2.6 2.2C9.6 17.5 4 11.9 3.1 5.9c-.2-1.4.8-2.4 2.2-2.4h1Z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.4c.8 1.2 2 1.9 3.5 1.9s2.7-.7 3.5-1.9" />
      <circle cx="9.3" cy="10" r=".9" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="10" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  paperclip: (
    <path d="M18.5 11.5 11 19a4.2 4.2 0 0 1-6-6l7.8-7.8a2.8 2.8 0 0 1 4 4L9 17a1.4 1.4 0 0 1-2-2l7-7" />
  ),
  pen: <path d="m4 20 1.4-4.2L16.6 4.6a2 2 0 0 1 2.8 2.8L8.2 18.6 4 20Z" />,
  send: <path d="M4 12 20 4l-4 16-4.5-6.5L4 12Z" />,
  "sound-on": (
    <>
      <path d="M4 9.5h3l4-3.2v11.4l-4-3.2H4v-5Z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  "sound-off": (
    <>
      <path d="M4 9.5h3l4-3.2v11.4l-4-3.2H4v-5Z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </>
  ),
  "mic-off": (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M4 4l16 16" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="6.5" width="13" height="11" rx="3" />
      <path d="m16 12 5-3v8l-5-3" />
    </>
  ),
  leave: (
    <path d="M14 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H14M10 12h11m0 0-4-4m4 4-4 4" />
  ),
  shield: <path d="M12 3 5 6v6c0 4.2 3 7.4 7 9 4-1.6 7-4.8 7-9V6l-7-3Z" />,
  arrow: <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </>
  ),
  command: <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />,
  thread: (
    <>
      <path d="M20 15a3 3 0 0 1-3 3H9l-4 3v-4a3 3 0 0 1-2-2.8V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v8Z" />
      <path d="M7 8.5h9M7 12h6" />
    </>
  ),
  reply: (
    <>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h9a6 6 0 0 1 6 6v1" />
    </>
  ),
  bell: (
    <>
      <path d="M18 15V10a6 6 0 0 0-12 0v5l-2 3h16l-2-3Z" />
      <path d="M9.5 21a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
};

export default function Icon({
  name,
  size = 18,
  strokeWidth = 1.6,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

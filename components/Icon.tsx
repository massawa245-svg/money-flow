// Linien-Icons (24er ViewBox), gleiche Formsprache wie in der Handy-App
const paths = {
  wallet: ['M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'M3 7l12-4v4', 'M16.5 13.5h.01'],
  send: ['M7 17L17 7', 'M8 7h9v9'],
  receive: ['M17 7L7 17', 'M16 17H7V8'],
  withdraw: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  plus: ['M12 5v14', 'M5 12h14'],
  store: [
    'M3 9l1.5-5h15L21 9',
    'M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z',
    'M5 13v7h14v-7',
    'M10 20v-4h4v4',
  ],
  scan: [
    'M4 8V5a1 1 0 0 1 1-1h3',
    'M16 4h3a1 1 0 0 1 1 1v3',
    'M20 16v3a1 1 0 0 1-1 1h-3',
    'M8 20H5a1 1 0 0 1-1-1v-3',
    'M4 12h16',
  ],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  home: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  list: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 17l5-5-5-5', 'M15 12H3'],
  login: ['M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3', 'M14 17l5-5-5-5', 'M19 12H8'],
  mail: ['M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z', 'M3 7l9 6 9-6'],
  note: ['M5 4h10l4 4v12H5z', 'M15 4v4h4', 'M8 13h8', 'M8 17h5'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  alert: ['M12 3l10 18H2z', 'M12 10v4', 'M12 17.5v.5'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 11v6', 'M12 7.5v.5'],
  lock: ['M6 11h12v10H6z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  key: ['M14 10a4 4 0 1 0-3.5 4L6 18.5V21h2.5l.5-.5V19h2v-2h1.5l1.5-1.5', 'M15.5 8.5h.01'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4'],
  fingerprint: ['M12 11v3a8 8 0 0 1-1 4', 'M8 7.5A6 6 0 0 1 18 12v1', 'M6 12a6 6 0 0 1 .5-2.5', 'M9 12a3 3 0 0 1 6 0v2a11 11 0 0 1-1 4.5', 'M6 16c.5-1 .5-2 .5-4'],
  camera: ['M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  phone: ['M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2'],
  pin: ['M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z', 'M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  device: ['M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M11 18h2'],
  laptop: ['M5 5h14v10H5z', 'M3 19h18'],
  save: ['M5 4h11l3 3v13H5z', 'M8 4v5h7V4', 'M8 20v-6h8v6'],
  refresh: ['M20 11a8 8 0 0 0-14-5l-2 2', 'M4 4v4h4', 'M4 13a8 8 0 0 0 14 5l2-2', 'M20 20v-4h-4'],
  ban: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M5.5 5.5l13 13'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  code: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M14 5l-4 14'],
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  className = 'w-5 h-5',
  strokeWidth = 2,
}: {
  name: IconName
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

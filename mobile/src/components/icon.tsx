import Svg, { Circle, Path } from 'react-native-svg';

// Stroke-Icons aus dem Design-Canvas (24er ViewBox)
const paths = {
  wallet: ['M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'M3 7l12-4v4'],
  send: ['M7 17L17 7', 'M8 7h9v9'],
  receive: ['M17 7L7 17', 'M16 17H7V8'],
  scan: [
    'M4 8V5a1 1 0 0 1 1-1h3',
    'M16 4h3a1 1 0 0 1 1 1v3',
    'M20 16v3a1 1 0 0 1-1 1h-3',
    'M8 20H5a1 1 0 0 1-1-1v-3',
    'M4 12h16',
  ],
  home: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  list: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  back: ['M15 18l-6-6 6-6'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  flash: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  store: [
    'M3 9l1.5-5h15L21 9',
    'M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z',
    'M5 13v7h14v-7',
    'M10 20v-4h4v4',
  ],
  faceId: [
    'M4 8V6a2 2 0 0 1 2-2h2',
    'M16 4h2a2 2 0 0 1 2 2v2',
    'M20 16v2a2 2 0 0 1-2 2h-2',
    'M8 20H6a2 2 0 0 1-2-2v-2',
    'M9 10v1',
    'M15 10v1',
    'M9.5 15a3.5 3.5 0 0 0 5 0',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  exchange: ['M4 8h14', 'M14 4l4 4-4 4', 'M20 16H6', 'M10 12l-4 4 4 4'],
  withdraw: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M9 12l2 2 4-4'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  camera: [
    'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z',
    'M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  ],
  fingerprint: [
    'M12 11v3a8 8 0 0 1-1 4',
    'M8 7.5A6 6 0 0 1 18 12v1',
    'M6 12a6 6 0 0 1 .5-2.5',
    'M9 12a3 3 0 0 1 6 0v2a11 11 0 0 1-1 4.5',
    'M6 16c.5-1 .5-2 .5-4',
  ],
  lock: ['M6 11h12v10H6z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  alert: ['M12 8v5', 'M12 16.5v.5'],
  logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 17l5-5-5-5', 'M15 12H3'],
} as const;

export type IconName = keyof typeof paths;

type IconProps = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 24, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {paths[name].map((d) => (
        <Path key={d} d={d} />
      ))}
      {name === 'wallet' ? <Circle cx="16.5" cy="13.5" r="1.5" /> : null}
    </Svg>
  );
}

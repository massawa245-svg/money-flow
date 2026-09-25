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
  withdraw: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
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

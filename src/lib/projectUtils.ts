export const DEFAULT_USER_NAME = 'Alex Johnson';
export const GUEST_USER_ID = 'guest-123';

export const TEAM_MEMBER_COLORS = [
  'bg-slate-700',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-orange-600',
  'bg-purple-600',
  'bg-rose-600',
];

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export function createLocalTimestamp(date = new Date()) {
  const millis = date.getTime();

  return {
    toMillis: () => millis,
    toDate: () => new Date(millis),
  };
}

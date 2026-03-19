import type { Profile } from '@/lib/types';

interface AvatarProps {
  user: Pick<Profile, 'display_name' | 'avatar_url'>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export function Avatar({ user, size = 'md' }: AvatarProps) {
  const cls = sizeClasses[size];

  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={user.display_name ?? 'User avatar'}
        className={`${cls} rounded-full object-cover flex-shrink-0`}
        referrerPolicy="no-referrer"
      />
    );
  }

  const initial = user.display_name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor: '#0D9488' }}
      aria-label={user.display_name ?? 'Unknown user'}
    >
      {initial}
    </div>
  );
}

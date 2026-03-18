import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AvatarProps {
  user: Pick<Profile, 'display_name' | 'avatar_url'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

export function Avatar({ user, size = 'md', className }: AvatarProps) {
  const cls = sizeClasses[size];

  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={user.display_name ?? 'User avatar'}
        className={cn(cls, 'rounded-full object-cover flex-shrink-0 ring-2 ring-white/20', className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  const initial = user.display_name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div
      className={cn(
        cls, 
        'rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 transition-all duration-300 ring-2 ring-white/20',
        'bg-gradient-to-br from-primary to-secondary shadow-soft',
        className
      )}
      aria-label={user.display_name ?? 'Unknown user'}
    >
      {initial}
    </div>
  );
}

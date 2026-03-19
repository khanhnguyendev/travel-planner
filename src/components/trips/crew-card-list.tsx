'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import type { TripRole } from '@/lib/types';

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface CrewMemberData {
  id: string;
  user_id: string;
  role: TripRole;
  joined_at: string | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  };
  balanceNet: number;
  contributions: number;
  paid: number;
}

interface CrewCardListProps {
  members: CrewMemberData[];
  currentUserId: string;
  currency: string;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function NetChip({ net, currency }: { net: number; currency: string }) {
  const isOwed = net > 0.005;
  const isOwing = net < -0.005;

  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: isOwed ? '#CCFBF1' : isOwing ? '#FEF3C7' : 'var(--color-bg-subtle)',
        color: isOwed ? '#0F766E' : isOwing ? '#92400E' : 'var(--color-text-subtle)',
      }}
    >
      {isOwed ? (
        <TrendingUp className="h-2.5 w-2.5" />
      ) : isOwing ? (
        <TrendingDown className="h-2.5 w-2.5" />
      ) : (
        <Minus className="h-2.5 w-2.5" />
      )}
      {isOwed
        ? `+${formatCurrency(net, currency)}`
        : isOwing
        ? `-${formatCurrency(Math.abs(net), currency)}`
        : 'Settled'}
    </span>
  );
}

const ROLE_COLORS: Record<TripRole, { bg: string; text: string }> = {
  owner: { bg: '#FEF3C7', text: '#92400E' },
  admin: { bg: '#EDE9FE', text: '#5B21B6' },
  editor: { bg: '#CCFBF1', text: '#0F766E' },
  viewer: { bg: '#F1F5F9', text: '#475569' },
};

// -------------------------------------------------------
// Single expandable card
// -------------------------------------------------------

function CrewCard({
  member,
  isYou,
  currency,
}: {
  member: CrewMemberData;
  isYou: boolean;
  currency: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = member.profile.display_name ?? 'Unknown member';
  const remain = member.contributions - member.paid;
  const isOwed = member.balanceNet > 0.005;
  const isOwing = member.balanceNet < -0.005;
  const roleStyle = ROLE_COLORS[member.role];

  const hasData = member.contributions > 0 || member.paid > 0;

  return (
    <div
      className="overflow-hidden rounded-[1.2rem] bg-white/70"
      style={isYou ? { outline: '1.5px solid var(--color-primary)', outlineOffset: '-1.5px' } : undefined}
    >
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <Avatar
          user={{ display_name: name, avatar_url: member.profile.avatar_url }}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {name}{isYou ? ' (you)' : ''}
          </p>
          <span
            className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
            style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}
          >
            {member.role}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <NetChip net={member.balanceNet} currency={currency} />
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="border-t px-3 pb-3 pt-2.5"
          style={{ borderColor: 'var(--color-border-muted)' }}
        >
          {!hasData ? (
            <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
              No financial activity recorded yet.
            </p>
          ) : (
            <div className="space-y-1">
              <StatRow label="Income put in" value={formatCurrency(member.contributions, currency)} />
              <StatRow label="Split portion" value={formatCurrency(member.paid, currency)} />
              <StatRow
                label="Remaining"
                value={formatCurrency(Math.max(0, remain), currency)}
                valueColor={remain < 0 ? '#EF4444' : undefined}
              />
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border-muted)' }}>
                <StatRow
                  label={isOwed ? 'Gets back' : isOwing ? 'Owes' : 'Settled'}
                  value={
                    isOwed
                      ? `+${formatCurrency(member.balanceNet, currency)}`
                      : isOwing
                      ? formatCurrency(Math.abs(member.balanceNet), currency)
                      : '—'
                  }
                  valueColor={isOwed ? '#0F766E' : isOwing ? '#B45309' : 'var(--color-text-subtle)'}
                  bold
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>{label}</span>
      <span
        className={bold ? 'text-xs font-semibold' : 'text-xs font-medium'}
        style={{ color: valueColor ?? 'var(--color-text-muted)' }}
      >
        {value}
      </span>
    </div>
  );
}

// -------------------------------------------------------
// CrewCardList
// -------------------------------------------------------

export function CrewCardList({ members, currentUserId, currency }: CrewCardListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <CrewCard
          key={member.id}
          member={member}
          isYou={member.user_id === currentUserId}
          currency={currency}
        />
      ))}
    </div>
  );
}

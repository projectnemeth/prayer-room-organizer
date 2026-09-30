import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DailyRhythm } from './DailyRhythm';
import {
  getPrayerFocusForDayOfWeek,
  weeklyPrayerFocusSchedule,
} from './mock-data';

describe('DailyRhythm', () => {
  it('renders all 7 weekly prayer focuses in schedule order', () => {
    render(<DailyRhythm />);

    expect(
      screen.getByRole('heading', { name: 'A daily rhythm of prayer' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Seven days of focused intercession' })
    ).toBeInTheDocument();

    const weeklySection = screen.getByRole('region', { name: 'Seven days of focused intercession' });
    expect(weeklySection).toBeInTheDocument();
    expect(weeklySection).toHaveAttribute('id', 'weekly-focus');
    expect(screen.getByRole('region', { name: 'Praying through Scripture' })).toHaveAttribute('id', 'praying-the-scriptures');

    for (const item of weeklyPrayerFocusSchedule) {
      expect(
        within(weeklySection).getByRole('heading', { name: item.focusTitle })
      ).toBeInTheDocument();
      expect(
        within(weeklySection).getByText(new RegExp(`${item.shortDay} · ${item.dayName}`, 'i'))
      ).toBeInTheDocument();
      expect(within(weeklySection).getByText(item.summary)).toBeInTheDocument();
      expect(within(weeklySection).getByRole('heading', { name: item.focusTitle }).closest('article')).toHaveAttribute('id', item.resourceUrl?.slice(1));
    }
  });

  it('correctly maps each day of the week to the requested focus theme', () => {
    // 1: Monday -> Marketplace
    expect(getPrayerFocusForDayOfWeek(1).title).toBe('Marketplace');
    // 2: Tuesday -> Revival
    expect(getPrayerFocusForDayOfWeek(2).title).toBe('Revival Tuesday');
    // 3: Wednesday -> Awakening (Next Gen)
    expect(getPrayerFocusForDayOfWeek(3).title).toBe('Awakening (Next Gen)');
    // 4: Thursday -> Family
    expect(getPrayerFocusForDayOfWeek(4).title).toBe('Family');
    // 5: Friday -> Fullness (Israel & the Nations)
    expect(getPrayerFocusForDayOfWeek(5).title).toBe('Fullness (Israel & the Nations)');
    // 6: Saturday -> Sabbath (delighting in God as Creator, Sustainer, and Coming King)
    expect(getPrayerFocusForDayOfWeek(6).title).toBe(
      'Sabbath (delighting in God as Creator, Sustainer, and Coming King)'
    );
    // 0: Sunday -> Sanctuary (blessing the Gathered Church)
    expect(getPrayerFocusForDayOfWeek(0).title).toBe(
      'Sanctuary (blessing the Gathered Church)'
    );
  });

  it('renders custom focus when provided via props', () => {
    render(
      <DailyRhythm
        focus={{
          title: 'Custom Focus Title',
          summary: 'Custom Focus Summary',
          scriptureReference: 'Acts 2:42',
          scriptureText: 'And they devoted themselves to the apostles doctrine...',
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Custom Focus Title' })).toBeInTheDocument();
    expect(screen.getByText('Custom Focus Summary')).toBeInTheDocument();
  });

  it('shows the full repeating reading schedule and the current day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-11-14T18:00:00Z'));
      render(<DailyRhythm />);
      const scriptures = within(screen.getByRole('region', { name: 'Praying through Scripture' }));
      const today = within(scriptures.getByRole('heading', { name: "Day 14 · Today's readings" }).closest('div')!);
      expect(today.getByText('Psalm 68 · Proverbs 14')).toBeInTheDocument();
      const table = within(scriptures.getByRole('table'));
      expect(table.getAllByRole('row')).toHaveLength(32);
      expect(within(table.getByRole('rowheader', { name: '30' }).closest('tr')!).getByText('Psalms 149–150')).toBeInTheDocument();
      expect(within(table.getByRole('rowheader', { name: '31' }).closest('tr')!).getByText('Catch up or reflect · no new reading')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

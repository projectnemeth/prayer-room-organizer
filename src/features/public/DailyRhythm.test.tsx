import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

    for (const item of weeklyPrayerFocusSchedule) {
      expect(
        within(weeklySection).getByRole('heading', { name: item.focusTitle })
      ).toBeInTheDocument();
      expect(
        within(weeklySection).getByText(new RegExp(`${item.shortDay} · ${item.dayName}`, 'i'))
      ).toBeInTheDocument();
      expect(within(weeklySection).getByText(item.summary)).toBeInTheDocument();
    }
  });

  it('correctly maps each day of the week to the requested focus theme', () => {
    // 1: Monday -> Marketplace
    expect(getPrayerFocusForDayOfWeek(1).title).toBe('Marketplace');
    // 2: Tuesday -> Ministries
    expect(getPrayerFocusForDayOfWeek(2).title).toBe('Ministries');
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
});

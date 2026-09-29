-- Publish Evening Altar from 5:00-6:00 PM America/Denver on every weekday
-- from October 1 through October 30, 2026. Also moves any older 4:30-5:30
-- seed records and their full-window volunteer shifts to the confirmed time.
do $$
declare
  v_day date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_old_starts_at timestamptz;
  v_old_ends_at timestamptz;
  v_room_event_id uuid;
  v_creator_id uuid;
begin
  select id into v_creator_id
  from public.profiles
  where role in ('admin', 'coordinator') and status = 'active'
  order by case role when 'admin' then 0 else 1 end, id
  limit 1;

  if v_creator_id is null then
    raise exception 'An active coordinator or admin profile is required to publish October evening gatherings';
  end if;

  for v_day in
    select d::date
    from generate_series(date '2026-10-01', date '2026-10-30', interval '1 day') as d
    where extract(isodow from d) between 1 and 5
  loop
    v_starts_at := (v_day + time '17:00') at time zone 'America/Denver';
    v_ends_at := (v_day + time '18:00') at time zone 'America/Denver';

    if (
      select count(*)
      from public.room_events
      where room_key = 'prayer-room'
        and title = 'Evening Altar'
        and (starts_at at time zone 'America/Denver')::date = v_day
    ) > 1 then
      raise exception 'Multiple Evening Altar room events exist on %', v_day;
    end if;

    select id, starts_at, ends_at
    into v_room_event_id, v_old_starts_at, v_old_ends_at
    from public.room_events
    where room_key = 'prayer-room'
      and title = 'Evening Altar'
      and (starts_at at time zone 'America/Denver')::date = v_day;

    if v_room_event_id is null then
      insert into public.room_events (
        room_key, title, event_type, description, internal_notes,
        starts_at, ends_at, visibility, created_by
      ) values (
        'prayer-room', 'Evening Altar', 'prayer_gathering',
        'Worship, thanksgiving, Scripture, and intercession as we close the day together.',
        'October weekday evening gathering', v_starts_at, v_ends_at, 'public', v_creator_id
      ) returning id into v_room_event_id;
    else
      update public.room_events
      set starts_at = v_starts_at, ends_at = v_ends_at, visibility = 'public'
      where id = v_room_event_id
        and (starts_at, ends_at, visibility) is distinct from (v_starts_at, v_ends_at, 'public'::public.room_event_visibility);
    end if;

    insert into public.public_events (
      room_event_id, title, description, location_label, participation_format,
      starts_at, ends_at, published_at, created_by
    ) values (
      v_room_event_id, 'Evening Altar',
      'Worship, thanksgiving, Scripture, and intercession as we close the day together.',
      'Lighthouse Prayer Room', 'in_person', v_starts_at, v_ends_at,
      timezone('utc', now()), v_creator_id
    ) on conflict (room_event_id) do update
      set starts_at = excluded.starts_at, ends_at = excluded.ends_at,
          published_at = coalesce(public.public_events.published_at, excluded.published_at);

    if v_old_starts_at is not null then
      update public.shifts
      set starts_at = v_starts_at, ends_at = v_ends_at
      where room_event_id = v_room_event_id
        and starts_at = v_old_starts_at
        and ends_at = v_old_ends_at
        and (starts_at, ends_at) is distinct from (v_starts_at, v_ends_at);
    end if;

    if not exists (select 1 from public.shifts where room_event_id = v_room_event_id) then
      insert into public.shifts (
        room_event_id, starts_at, ends_at, required_volunteers,
        status, volunteer_instructions, created_by
      ) values (
        v_room_event_id, v_starts_at, v_ends_at, 5, 'scheduled',
        'Host and open the Lighthouse Prayer Room for Evening Altar.', v_creator_id
      );
    end if;

    insert into public.shift_role_requirements (
      shift_id, role, required_count, volunteer_instructions
    )
    select s.id, roles.role, 1, s.volunteer_instructions
    from public.shifts s
    cross join (values
      ('prayer_leader'::public.shift_role),
      ('worship_leader'::public.shift_role),
      ('worship_team_member'::public.shift_role),
      ('tech_director'::public.shift_role),
      ('host'::public.shift_role)
    ) as roles(role)
    where s.room_event_id = v_room_event_id
    on conflict (shift_id, role) do nothing;
  end loop;
end;
$$;

-- Add two extra Night of Worship gatherings without replacing regular Altar events.
-- Both dates and times are local to America/Denver.
do $$
declare
  v_day date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_room_event_id uuid;
  v_creator_id uuid;
begin
  select id into v_creator_id
  from public.profiles
  where role in ('admin', 'coordinator') and status = 'active'
  order by case role when 'admin' then 0 else 1 end, id
  limit 1;

  if v_creator_id is null then
    raise exception 'An active coordinator or admin profile is required';
  end if;

  foreach v_day in array array[date '2026-10-02', date '2026-10-30']
  loop
    v_starts_at := (v_day + time '19:00') at time zone 'America/Denver';
    v_ends_at := (v_day + time '20:30') at time zone 'America/Denver';

    if (
      select count(*) from public.room_events
      where room_key = 'prayer-room' and title = 'Night of Worship'
        and (starts_at at time zone 'America/Denver')::date = v_day
    ) > 1 then
      raise exception 'Multiple Night of Worship events exist on %', v_day;
    end if;

    select id into v_room_event_id
    from public.room_events
    where room_key = 'prayer-room' and title = 'Night of Worship'
      and (starts_at at time zone 'America/Denver')::date = v_day;

    if v_room_event_id is null then
      insert into public.room_events (
        room_key, title, event_type, description, starts_at, ends_at, visibility, created_by
      ) values (
        'prayer-room', 'Night of Worship', 'worship_gathering',
        'Join us for a Night of Worship.', v_starts_at, v_ends_at, 'public', v_creator_id
      ) returning id into v_room_event_id;
    elsif not exists (
      select 1 from public.room_events where id = v_room_event_id
        and starts_at = v_starts_at and ends_at = v_ends_at and visibility = 'public'
    ) then
      raise exception 'Existing Night of Worship details differ on %', v_day;
    end if;

    insert into public.public_events (
      room_event_id, title, description, location_label, participation_format,
      starts_at, ends_at, published_at, created_by
    ) values (
      v_room_event_id, 'Night of Worship', 'Join us for a Night of Worship.',
      'Lighthouse Prayer Room', 'in_person', v_starts_at, v_ends_at, now(), v_creator_id
    ) on conflict (room_event_id) do update
      set title = excluded.title, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
          published_at = coalesce(public.public_events.published_at, excluded.published_at);

    if not exists (select 1 from public.shifts where room_event_id = v_room_event_id) then
      insert into public.shifts (
        room_event_id, starts_at, ends_at, required_volunteers, status,
        volunteer_instructions, created_by
      ) values (
        v_room_event_id, v_starts_at, v_ends_at, 5, 'scheduled',
        'Host and serve the Night of Worship at the Lighthouse Prayer Room.', v_creator_id
      );
    end if;

    insert into public.shift_role_requirements (shift_id, role, required_count, volunteer_instructions)
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

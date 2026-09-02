-- Populate October 2026 weekday morning gatherings (6:30am - 7:30am America/Denver)
-- Stores room_events, public_events, and volunteer shifts for each weekday in October 2026.

do $$
declare
  v_creator_id uuid;
  v_date_str text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_room_event_id uuid;
  v_day integer;
  v_dow integer;
begin
  -- Select an existing admin/coordinator profile, or fallback to any active profile
  select id into v_creator_id from public.profiles where role in ('admin', 'coordinator') limit 1;
  
  if v_creator_id is null then
    select id into v_creator_id from public.profiles limit 1;
  end if;

  if v_creator_id is null then
    v_creator_id := '00000000-0000-0000-0000-000000000001'::uuid;
    insert into auth.users (id, email)
    values (v_creator_id, 'system.seed@altarinitiative.org')
    on conflict (id) do nothing;

    insert into public.profiles (id, display_name, email, role, status, approved_at)
    values (v_creator_id, 'System Seed', 'system.seed@altarinitiative.org', 'admin', 'active', timezone('utc', now()))
    on conflict (id) do update set role = 'admin', status = 'active';
  end if;

  -- Iterate through October 2026 days (1 to 31)
  for v_day in 1..31 loop
    v_date_str := '2026-10-' || lpad(v_day::text, 2, '0');
    v_starts_at := (v_date_str || ' 06:30:00-06:00')::timestamptz;
    v_ends_at := (v_date_str || ' 07:30:00-06:00')::timestamptz;
    
    -- Check day of week in Denver time (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
    v_dow := extract(dow from v_starts_at at time zone 'America/Denver');
    
    -- Only weekdays (Monday through Friday)
    if v_dow >= 1 and v_dow <= 5 then
      select id into v_room_event_id
      from public.room_events
      where starts_at = v_starts_at and room_key = 'prayer-room';

      if v_room_event_id is null then
        insert into public.room_events (
          room_key,
          title,
          event_type,
          description,
          internal_notes,
          starts_at,
          ends_at,
          visibility,
          created_by
        ) values (
          'prayer-room',
          'Morning Altar',
          'prayer_gathering',
          'Worship, thanksgiving, Scripture, and intercession as we consecrate the day together.',
          'October weekday morning gathering',
          v_starts_at,
          v_ends_at,
          'public',
          v_creator_id
        ) returning id into v_room_event_id;
      end if;

      insert into public.public_events (
        room_event_id,
        title,
        description,
        location_label,
        participation_format,
        starts_at,
        ends_at,
        published_at,
        created_by
      ) values (
        v_room_event_id,
        'Morning Altar',
        'Worship, thanksgiving, Scripture, and intercession as we consecrate the day together.',
        'Lighthouse Prayer Room',
        'in_person',
        v_starts_at,
        v_ends_at,
        timezone('utc', now()),
        v_creator_id
      ) on conflict (room_event_id) do update set
        title = excluded.title,
        description = excluded.description,
        location_label = excluded.location_label,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        published_at = excluded.published_at;

      insert into public.shifts (
        room_event_id,
        starts_at,
        ends_at,
        required_volunteers,
        status,
        volunteer_instructions,
        created_by
      )
      select
        v_room_event_id,
        v_starts_at,
        v_ends_at,
        1,
        'scheduled',
        'Host and open the Lighthouse Prayer Room for Morning Altar.',
        v_creator_id
      where not exists (
        select 1 from public.shifts where room_event_id = v_room_event_id
      );
    end if;
  end loop;
end;
$$;

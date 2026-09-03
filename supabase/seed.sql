-- Seed script for local development and database reset
-- Populates October 2026 weekday morning gatherings (6:30am - 7:30am America/Denver)

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

  for v_day in 1..31 loop
    v_date_str := '2026-10-' || lpad(v_day::text, 2, '0');
    v_starts_at := (v_date_str || ' 06:30:00-06:00')::timestamptz;
    v_ends_at := (v_date_str || ' 07:30:00-06:00')::timestamptz;
    
    v_dow := extract(dow from v_starts_at at time zone 'America/Denver');
    
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

  -- Seed October 2026 daily prayer focuses following the weekly schedule
  for v_day in 1..31 loop
    declare
      v_date date := ('2026-10-' || lpad(v_day::text, 2, '0'))::date;
      v_focus_dow integer := extract(dow from v_date);
      v_focus_title text;
      v_focus_summary text;
      v_focus_ref text;
      v_focus_url text;
      v_focus_notes text;
      v_focus_id uuid;
    begin
      if v_focus_dow = 1 then
        v_focus_title := 'Marketplace';
        v_focus_summary := 'Pray for believers in business, trades, education, healthcare, civic leadership, and every workplace—that integrity, excellence, and the fragrance of Christ would transform our city’s marketplace.';
        v_focus_ref := 'Colossians 3:23-24';
        v_focus_url := '#marketplace';
        v_focus_notes := 'Focus on praying for faith in everyday work, ethical leadership, and Kingdom impact across our city.';
      elsif v_focus_dow = 2 then
        v_focus_title := 'Ministries';
        v_focus_summary := 'Pray for local churches, outreach ministries, pastors, and leaders serving the vulnerable across our region—for supernatural endurance, unity, and fresh spiritual power.';
        v_focus_ref := '2 Thessalonians 1:11-12';
        v_focus_url := '#ministries';
        v_focus_notes := 'Pray for pastors, staff, cross-church partnerships, and ministries serving the marginalized.';
      elsif v_focus_dow = 3 then
        v_focus_title := 'Awakening (Next Gen)';
        v_focus_summary := 'Intercede for children, youth, college students, and emerging generations—for an awakening to the holiness and love of Jesus, spiritual protection, and bold faith.';
        v_focus_ref := 'Psalm 78:6-7';
        v_focus_url := '#awakening';
        v_focus_notes := 'Intercede for schools, campuses, youth ministries, and children encountering the living God.';
      elsif v_focus_dow = 4 then
        v_focus_title := 'Family';
        v_focus_summary := 'Lift up families, marriages, single parents, children, and households. Pray for healing, reconciliation, deep generational faith, and homes filled with the peace of Christ.';
        v_focus_ref := 'Joshua 24:15';
        v_focus_url := '#family';
        v_focus_notes := 'Stand in the gap for marriages, foster families, parenting wisdom, and restoration of broken relationships.';
      elsif v_focus_dow = 5 then
        v_focus_title := 'Fullness (Israel & the Nations)';
        v_focus_summary := 'Pray for the peace of Jerusalem, the salvation of Israel, unreached people groups, and missionaries around the globe—that all nations would behold His glory.';
        v_focus_ref := 'Isaiah 62:6-7';
        v_focus_url := '#fullness';
        v_focus_notes := 'Pray for the global harvest, cross-cultural workers, and God’s ancient covenant promises.';
      elsif v_focus_dow = 6 then
        v_focus_title := 'Sabbath (delighting in God as Creator, Sustainer, and Coming King)';
        v_focus_summary := 'Enter into rest and adoration, delighting in God as Creator, Sustainer, and Coming King. Set aside striving and recalibrate in His abiding presence and sovereign goodness.';
        v_focus_ref := 'Psalm 103:1-2';
        v_focus_url := '#sabbath';
        v_focus_notes := 'Encourage room attendees to slow down, worship without agenda, and rest in Christ.';
      else
        v_focus_title := 'Sanctuary (blessing the Gathered Church)';
        v_focus_summary := 'Bless the gathered Church on the Lord’s Day. Pray for pastors, teachers, worshipers, and seekers assembling in sanctuaries across our region—for conviction, joy, and the manifest presence of God.';
        v_focus_ref := 'Psalm 134:1-2';
        v_focus_url := '#sanctuary';
        v_focus_notes := 'Cover Sunday services, gospel preaching, repentance, and visitors encountering Jesus.';
      end if;

      select id into v_focus_id from public.prayer_focuses where focus_date = v_date;
      if v_focus_id is null then
        insert into public.prayer_focuses (
          focus_date, title, scripture_reference, volunteer_notes, created_by
        ) values (
          v_date, v_focus_title, v_focus_ref, v_focus_notes, v_creator_id
        ) returning id into v_focus_id;
      else
        update public.prayer_focuses
        set title = v_focus_title,
            scripture_reference = v_focus_ref,
            volunteer_notes = v_focus_notes,
            updated_at = timezone('utc', now())
        where id = v_focus_id;
      end if;

      insert into public.public_prayer_focuses (
        prayer_focus_id, title, public_summary, scripture_reference, resource_url, published_at, created_by
      ) values (
        v_focus_id, v_focus_title, v_focus_summary, v_focus_ref, v_focus_url, timezone('utc', now()), v_creator_id
      ) on conflict (prayer_focus_id) do update set
        title = excluded.title,
        public_summary = excluded.public_summary,
        scripture_reference = excluded.scripture_reference,
        resource_url = excluded.resource_url,
        published_at = excluded.published_at,
        updated_at = timezone('utc', now());
    end;
  end loop;
end;
$$;

-- Populate October 2026 weekday evening gatherings (4:30pm - 5:30pm America/Denver)
do $$
declare
  v_creator_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_room_event_id uuid;
  v_day integer;
begin
  select id into v_creator_id from public.profiles where role in ('admin', 'coordinator') limit 1;
  if v_creator_id is null then select id into v_creator_id from public.profiles limit 1; end if;
  if v_creator_id is null then
    v_creator_id := '00000000-0000-0000-0000-000000000001'::uuid;
    insert into auth.users (id, email) values (v_creator_id, 'system.seed@altarinitiative.org') on conflict (id) do nothing;
    insert into public.profiles (id, display_name, email, role, status, approved_at)
    values (v_creator_id, 'System Seed', 'system.seed@altarinitiative.org', 'admin', 'active', timezone('utc', now()))
    on conflict (id) do update set role = 'admin', status = 'active';
  end if;
  for v_day in 1..31 loop
    v_starts_at := (format('2026-10-%s 16:30:00-06:00', lpad(v_day::text, 2, '0')))::timestamptz;
    v_ends_at := (format('2026-10-%s 17:30:00-06:00', lpad(v_day::text, 2, '0')))::timestamptz;
    if extract(dow from v_starts_at at time zone 'America/Denver') between 1 and 5 then
      select id into v_room_event_id from public.room_events where starts_at = v_starts_at and room_key = 'prayer-room';
      if v_room_event_id is null then
        insert into public.room_events (room_key, title, event_type, description, internal_notes, starts_at, ends_at, visibility, created_by)
        values ('prayer-room', 'Evening Altar', 'prayer_gathering', 'Worship, thanksgiving, Scripture, and intercession as we close the day together.', 'October weekday evening gathering', v_starts_at, v_ends_at, 'public', v_creator_id)
        returning id into v_room_event_id;
      end if;
      insert into public.public_events (room_event_id, title, description, location_label, participation_format, starts_at, ends_at, published_at, created_by)
      values (v_room_event_id, 'Evening Altar', 'Worship, thanksgiving, Scripture, and intercession as we close the day together.', 'Lighthouse Prayer Room', 'in_person', v_starts_at, v_ends_at, timezone('utc', now()), v_creator_id)
      on conflict (room_event_id) do update set title = excluded.title, description = excluded.description, location_label = excluded.location_label, starts_at = excluded.starts_at, ends_at = excluded.ends_at, published_at = excluded.published_at;
      insert into public.shifts (room_event_id, starts_at, ends_at, required_volunteers, status, volunteer_instructions, created_by)
      select v_room_event_id, v_starts_at, v_ends_at, 1, 'scheduled', 'Host and open the Lighthouse Prayer Room for Evening Altar.', v_creator_id
      where not exists (select 1 from public.shifts where room_event_id = v_room_event_id);
    end if;
  end loop;
end;
$$;

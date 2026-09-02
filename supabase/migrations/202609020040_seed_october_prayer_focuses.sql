-- Seed October 2026 daily prayer focuses following the weekly schedule:
-- MON: Marketplace
-- TUE: Ministries
-- WED: Awakening (Next Gen)
-- THU: Family
-- FRI: Fullness (Israel & the Nations)
-- SAT: Sabbath (delighting in God as Creator, Sustainer, and Coming King)
-- SUN: Sanctuary (blessing the Gathered Church)

do $$
declare
  v_creator_id uuid;
  v_day integer;
  v_date date;
  v_dow integer;
  v_title text;
  v_summary text;
  v_scripture_ref text;
  v_resource_url text;
  v_notes text;
  v_focus_id uuid;
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
    v_date := ('2026-10-' || lpad(v_day::text, 2, '0'))::date;
    v_dow := extract(dow from v_date); -- 0=SUN, 1=MON, 2=TUE, 3=WED, 4=THU, 5=FRI, 6=SAT

    if v_dow = 1 then
      v_title := 'Marketplace';
      v_summary := 'Pray for believers in business, trades, education, healthcare, civic leadership, and every workplace—that integrity, excellence, and the fragrance of Christ would transform our city’s marketplace.';
      v_scripture_ref := 'Colossians 3:23-24';
      v_resource_url := '#marketplace';
      v_notes := 'Focus on praying for faith in everyday work, ethical leadership, and Kingdom impact across our city.';
    elsif v_dow = 2 then
      v_title := 'Ministries';
      v_summary := 'Pray for local churches, outreach ministries, pastors, and leaders serving the vulnerable across our region—for supernatural endurance, unity, and fresh spiritual power.';
      v_scripture_ref := '2 Thessalonians 1:11-12';
      v_resource_url := '#ministries';
      v_notes := 'Pray for pastors, staff, cross-church partnerships, and ministries serving the marginalized.';
    elsif v_dow = 3 then
      v_title := 'Awakening (Next Gen)';
      v_summary := 'Intercede for children, youth, college students, and emerging generations—for an awakening to the holiness and love of Jesus, spiritual protection, and bold faith.';
      v_scripture_ref := 'Psalm 78:6-7';
      v_resource_url := '#awakening';
      v_notes := 'Intercede for schools, campuses, youth ministries, and children encountering the living God.';
    elsif v_dow = 4 then
      v_title := 'Family';
      v_summary := 'Lift up families, marriages, single parents, children, and households. Pray for healing, reconciliation, deep generational faith, and homes filled with the peace of Christ.';
      v_scripture_ref := 'Joshua 24:15';
      v_resource_url := '#family';
      v_notes := 'Stand in the gap for marriages, foster families, parenting wisdom, and restoration of broken relationships.';
    elsif v_dow = 5 then
      v_title := 'Fullness (Israel & the Nations)';
      v_summary := 'Pray for the peace of Jerusalem, the salvation of Israel, unreached people groups, and missionaries around the globe—that all nations would behold His glory.';
      v_scripture_ref := 'Isaiah 62:6-7';
      v_resource_url := '#fullness';
      v_notes := 'Pray for the global harvest, cross-cultural workers, and God’s ancient covenant promises.';
    elsif v_dow = 6 then
      v_title := 'Sabbath (delighting in God as Creator, Sustainer, and Coming King)';
      v_summary := 'Enter into rest and adoration, delighting in God as Creator, Sustainer, and Coming King. Set aside striving and recalibrate in His abiding presence and sovereign goodness.';
      v_scripture_ref := 'Psalm 103:1-2';
      v_resource_url := '#sabbath';
      v_notes := 'Encourage room attendees to slow down, worship without agenda, and rest in Christ.';
    else
      v_title := 'Sanctuary (blessing the Gathered Church)';
      v_summary := 'Bless the gathered Church on the Lord’s Day. Pray for pastors, teachers, worshipers, and seekers assembling in sanctuaries across our region—for conviction, joy, and the manifest presence of God.';
      v_scripture_ref := 'Psalm 134:1-2';
      v_resource_url := '#sanctuary';
      v_notes := 'Cover Sunday services, gospel preaching, repentance, and visitors encountering Jesus.';
    end if;

    select id into v_focus_id from public.prayer_focuses where focus_date = v_date;
    if v_focus_id is null then
      insert into public.prayer_focuses (
        focus_date,
        title,
        scripture_reference,
        volunteer_notes,
        created_by
      ) values (
        v_date,
        v_title,
        v_scripture_ref,
        v_notes,
        v_creator_id
      ) returning id into v_focus_id;
    else
      update public.prayer_focuses
      set title = v_title,
          scripture_reference = v_scripture_ref,
          volunteer_notes = v_notes,
          updated_at = timezone('utc', now())
      where id = v_focus_id;
    end if;

    insert into public.public_prayer_focuses (
      prayer_focus_id,
      title,
      public_summary,
      scripture_reference,
      resource_url,
      published_at,
      created_by
    ) values (
      v_focus_id,
      v_title,
      v_summary,
      v_scripture_ref,
      v_resource_url,
      timezone('utc', now()),
      v_creator_id
    ) on conflict (prayer_focus_id) do update set
      title = excluded.title,
      public_summary = excluded.public_summary,
      scripture_reference = excluded.scripture_reference,
      resource_url = excluded.resource_url,
      published_at = excluded.published_at,
      updated_at = timezone('utc', now());
  end loop;
end;
$$;

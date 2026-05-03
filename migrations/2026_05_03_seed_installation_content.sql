-- 2026-05-03  Seed the Installation FY 2026-27 content.
--
-- (1) Updates the existing installation agenda's body + summary with the
--     full formal record (markdown).
-- (2) Inserts the paired news post (warm story) — chapter-scoped to Kanpur.
-- (3) Creates members + chapter_memberships + committee_appointments rows
--     for the seven elected office-bearers so the chapter Committee
--     section auto-populates with their names + firms (and photos once
--     they upload one via /me/profile).
--
-- Idempotent: every insert uses on-conflict guards. Safe to re-run after
-- editing the markdown above the do-block.

-- ────────────────────────────────────────────────────────────────────────
-- Helper functions (defined first so the do-block below can call them).
-- ────────────────────────────────────────────────────────────────────────

-- Ranks roles so an upsert never DEMOTES an existing super_admin.
create or replace function public.greatest_role(a text, b text) returns text as $func$
declare
  rank_a int := case a when 'super_admin' then 3 when 'admin' then 2 else 1 end;
  rank_b int := case b when 'super_admin' then 3 when 'admin' then 2 else 1 end;
begin
  return case when rank_a >= rank_b then a else b end;
end;
$func$ language plpgsql immutable;

-- Idempotent upsert of a member + their committee appointment.
create or replace function public.upsert_committee_member(
  p_member_id   text,
  p_name        text,
  p_company     text,
  p_chapter_id  uuid,
  p_role_key    text,
  p_order       int,
  p_role        text default 'member'
) returns void as $func$
declare
  v_email text := p_member_id || '@upcbma.com'; -- placeholder; admins set the real email via /admin/members
begin
  -- Make sure the role exists in the committee_roles lookup. Friendly
  -- fallback for keys that weren't seeded earlier.
  insert into public.committee_roles (key, name, category, default_order, active)
  values (
    p_role_key,
    initcap(replace(p_role_key, '_', ' ')),
    case
      when p_role_key in ('president','vice_president','general_secretary',
                          'joint_secretary','treasurer','joint_treasurer')
        then 'leadership'
      else 'team'
    end,
    p_order,
    true
  )
  on conflict (key) do nothing;

  -- Member row.
  insert into public.members (id, name, company, email, role, active, member_since)
  values (p_member_id, p_name, p_company, v_email, p_role, true, '2026-05-02')
  on conflict (id) do update
    set name = excluded.name,
        company = excluded.company,
        role = public.greatest_role(public.members.role, excluded.role),
        active = true;

  -- Chapter membership.
  insert into public.chapter_memberships (member_id, chapter_id, member_since, active)
  values (p_member_id, p_chapter_id, '2026-05-02', true)
  on conflict (member_id, chapter_id) do nothing;

  -- Committee appointment for FY 2026-27 (May 2026 → Apr 2027).
  insert into public.committee_appointments (
    member_id, role_key, chapter_id,
    term_start, term_end, status, display_order
  ) values (
    p_member_id, p_role_key, p_chapter_id,
    '2026-05-02', '2027-04-30', 'active', p_order
  )
  on conflict do nothing;
end;
$func$ language plpgsql;

-- ────────────────────────────────────────────────────────────────────────
-- Seed payload.
-- ────────────────────────────────────────────────────────────────────────
do $$
declare
  v_chapter_id uuid := '11111111-1111-1111-1111-111111111111';
begin

  -- 1) Update the installation agenda's body + summary.
  update public.agendas set
    summary = 'Shree Lalit Shyam Dasani installed as President of UPCBMA Kanpur Chapter for FY 2026-27 on 2 May 2026 at IIA Bhawan, with a seven-member Managing Committee elected unanimously and the four-pillar vision (Growth, Transparency, Technical, Welfare) adopted.',
    body = $md$
## At a glance

- **Date:** Saturday, 2 May 2026
- **Time:** 5:00 PM onwards
- **Venue:** IIA Bhawan, Kanpur (Indian Industries Association, Kanpur Chapter)
- **Programme:** Installation ceremony followed by High Tea
- **Quorum:** First General Meeting of FY 2026-27 — proceedings duly approved by the membership present
- **Term:** FY 2026-27 (per chapter convention)

## Resolution

The Managing Committee of the UPCBMA Kanpur Chapter convened the Installation Ceremony and First General Meeting of FY 2026-27 on Saturday, 2 May 2026, at IIA Bhawan, Kanpur. The general body unanimously elected the new office-bearers and ratified the Vision for FY 2026-27.

## The Fraternity's Elected Stewards

| Office | Member | Firm |
|---|---|---|
| **President** | Shree Lalit Shyam Dasani | Himangi Packaging |
| **Vice-President I** | Mr. Anand Bhatia | Laxmi Sheva Packaging |
| **Vice-President II** | Mr. Adhish Rastogi | UVR Commercial Pvt. Ltd. |
| **General Secretary** | Mr. Sandeep Patni | Shakti Packagers |
| **Joint Secretary** | Mr. Jayesh Kanodia | Roll Pack Industries (P) Ltd. |
| **Treasurer** | Mr. Sparsh Mehrotra | Senior Box Factory, Ramji Press |
| **Joint Treasurer** | Mr. Varun Jain | Siddhartha Packagers |

Also present and recorded in attendance: Anand Bhatia, Adish Rastogi, Shailendra Singh, Prakash Kanodia, Naveen Jain, Rahul Dwivedi, Shameem, and other members of the chapter fraternity.

## Vision for FY 2026-27 — Four Pillars. One UPCBMA.

1. **Growth** — Expanding participation, reach and opportunity.
2. **Transparency** — Open books, open meetings, open dialogue.
3. **Technical** — Sharper skills, stronger standards.
4. **Welfare** — Members first — always.

## Implementation milestones

- ✅ **Resolution passed** — 2 May 2026
- ✅ **Oath administered** — 2 May 2026
- ✅ **Outgoing committee acknowledged** — Shri Vivek Kanodia (immediate past president) and outgoing office-bearers
- ✅ **Vision adopted** — Four-pillar framework
- 🔄 **First Managing Committee meeting** — to be convened within 30 days of installation
- 🔄 **FY 2026-27 calendar of events** — to be circulated by Joint Secretary
- 🔄 **FCBM affiliation reaffirmation** — annual filing in progress

## Press coverage

The installation was reported in *Amar Ujala* (3 May 2026) and *Dinar Times*, Kanpur edition (3 May 2026). Newspaper clippings on file with the secretariat.

## Acknowledgements

The Managing Committee places on record its sincere gratitude to:

- The outgoing Managing Committee for their service to the chapter.
- Shri Vivek Kanodia, immediate past president, for his stewardship.
- IIA Kanpur Chapter for hosting the venue.
- Federation of Corrugated Box Manufacturers of India (FCBM) for ongoing affiliation.

---

For the warm story of the evening — speeches, attendees, atmosphere — see the [news coverage](/news).
$md$,
    started_on = '2026-05-02',
    status = 'active',
    approval_status = 'approved',
    priority = 'high',
    category = 'policy',
    updated_at = now()
  where slug = 'installation-of-the-new-committee-26-2027-edjs';

  -- 2) Insert the paired news post (idempotent on title).
  if not exists (
    select 1 from public.news
    where chapter_id = v_chapter_id
      and title = 'Lalit Shyam Dasani takes the helm: UPCBMA Kanpur installs its new committee'
  ) then
    insert into public.news (id, chapter_id, tag, title, body, published_date)
    values (
      gen_random_uuid(),
      v_chapter_id,
      'announcement',
      'Lalit Shyam Dasani takes the helm: UPCBMA Kanpur installs its new committee',
      $md$
*A new chapter — quite literally — opened on Saturday at IIA Bhawan as the corrugated box fraternity of Kanpur welcomed Shree Lalit Shyam Dasani as President of UPCBMA's Kanpur Chapter for FY 2026-27.*

The hall filled early. By 5:00 PM, members from across Kanpur's box manufacturing community had taken their seats in IIA Bhawan, the green and gold of UPCBMA's standees framing a stage that would, by evening's end, change hands.

## A change of guard, not of spirit

> This evening marks not merely a change of hands — it is the beginning of a renewed chapter.

That single line, printed on every welcome card placed on the seats, set the tone for the evening.

Shree **Lalit Shyam Dasani** — Director of Himangi Packaging and a long-standing voice in the Kanpur fraternity — was unanimously installed as President. Joining him at the helm:

- **Anand Bhatia** (Laxmi Sheva Packaging) and **Adhish Rastogi** (UVR Commercial Pvt. Ltd.) as Vice-Presidents
- **Sandeep Patni** (Shakti Packagers) as General Secretary, with **Jayesh Kanodia** (Roll Pack Industries) as Joint Secretary
- **Sparsh Mehrotra** (Senior Box Factory, Ramji Press) as Treasurer, with **Varun Jain** (Siddhartha Packagers) as Joint Treasurer

The general body greeted each name with applause. Anand Bhatia, Adish Rastogi, Shailendra Singh, Prakash Kanodia, Naveen Jain, Rahul Dwivedi, Shameem and many other members of the chapter were in attendance.

## Four pillars. One UPCBMA.

The new committee's vision for the year was laid out plainly:

> **Growth · Transparency · Technical · Welfare**

Translated: expanding member participation, opening books and meetings to scrutiny, raising the chapter lab's standards, and putting members' welfare ahead of everything else.

A green slide on stage carried the quiet challenge of the day — *"An association is only as strong as the members who shape it."* — under a checklist:

- Attend the monthly meetings
- Use the lab — it is yours
- Consult the empanelled professionals
- Participate in the year's events
- Speak up. Contribute. Stand together.

## Voices from the fraternity

Congratulations poured in from across the industry the same evening.

> Heartiest congratulations on your well-deserved post. Your commitment to the growth and welfare of the business community in Kanpur is widely recognized. We look forward to seeing positive changes, strengthened collaboration, and new milestones under your able leadership.

> प्रिय ललित जी एवं टीम, UPCBMA कानपुर चैप्टर के अध्यक्ष एवं कार्यकारिणी के रूप में वर्ष 2026-2028 के लिए निर्वाचित होने पर आप सभी को हृदय से बधाई एवं शुभकामनाएं। आपका सर्वसम्मति से चुना जाना सदस्यों के आपके प्रति अटूट विश्वास और सम्मान का प्रतीक है।
>
> — **विवेक कनोडिया**, *पूर्व अध्यक्ष, UPCBMA कानपुर चैप्टर*

## Press coverage

The installation was carried in *Amar Ujala* and *Dinar Times*' Kanpur editions on 3 May 2026 under the headline *"ललित श्यामदासानी बने यूपीसीबीएमए के अध्यक्ष"* — Lalit Shyamdasani becomes UPCBMA President.

## What's next

The first Managing Committee meeting of FY 2026-27 will be convened within thirty days. The year's calendar — monthly member meets, professional empanelment sessions, lab open days, and the next AGM — will follow shortly via the Joint Secretary.

For the formal record of resolutions, attendance and term details, see the [official agenda entry](/agendas/installation-of-the-new-committee-26-2027-edjs).
$md$,
      '2026-05-03'
    );
  end if;

  -- 3) Office-bearers — members + chapter_memberships + committee_appointments.
  --
  -- Officers (President, Secretary, Joint Secretary, Treasurer) are stamped
  -- with role='admin' so they get full /admin access on day one. Vice-presidents
  -- and the joint treasurer keep role='member' for now — admins can elevate
  -- them via /admin/members later if they want.
  perform public.upsert_committee_member(
    'lalit-shyam-dasani', 'Lalit Shyam Dasani', 'Himangi Packaging',
    v_chapter_id, 'president', 1, 'admin'
  );
  perform public.upsert_committee_member(
    'anand-bhatia', 'Anand Bhatia', 'Laxmi Sheva Packaging',
    v_chapter_id, 'vice_president', 2, 'member'
  );
  perform public.upsert_committee_member(
    'adhish-rastogi', 'Adhish Rastogi', 'UVR Commercial Pvt. Ltd.',
    v_chapter_id, 'vice_president', 3, 'member'
  );
  perform public.upsert_committee_member(
    'sandeep-patni', 'Sandeep Patni', 'Shakti Packagers',
    v_chapter_id, 'general_secretary', 4, 'admin'
  );
  perform public.upsert_committee_member(
    'jayesh-kanodia', 'Jayesh Kanodia', 'Roll Pack Industries (P) Ltd.',
    v_chapter_id, 'joint_secretary', 5, 'admin'
  );
  perform public.upsert_committee_member(
    'sparsh-mehrotra', 'Sparsh Mehrotra', 'Senior Box Factory, Ramji Press',
    v_chapter_id, 'treasurer', 6, 'admin'
  );
  perform public.upsert_committee_member(
    'varun-jain', 'Varun Jain', 'Siddhartha Packagers',
    v_chapter_id, 'joint_treasurer', 7, 'member'
  );

end $$;

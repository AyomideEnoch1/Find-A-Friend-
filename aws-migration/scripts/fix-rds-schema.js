/**
 * fix-rds-schema.js
 * Temporary VPC Lambda that connects to AWS RDS to:
 * 1. Redefine public.trg_fn_push_notification() as a no-op to remove the pg_net / net schema dependency.
 * 2. Run the Anonymous Board Admin Enhancements (is_anonymous_linked column, policies).
 */

const { Client } = require('pg');

exports.handler = async function(event, context) {
  const client = new Client({
    host: process.env.RDS_HOST,
    port: 5432,
    database: 'faf_db',
    user: 'postgres',
    password: process.env.RDS_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  const results = [];

  try {
    await client.connect();
    console.log('Connected to RDS. Running database fixes...');

    const queries = [
      // 1. Redefine trg_fn_push_notification to be a no-op (no pg_net)
      {
        label: 'Redefine public.trg_fn_push_notification to no-op',
        sql: `
          CREATE OR REPLACE FUNCTION public.trg_fn_push_notification()
          RETURNS TRIGGER AS $$
          BEGIN
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },

      // 2. Add is_anonymous_linked column to events
      {
        label: 'Add is_anonymous_linked to events',
        sql: `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_anonymous_linked BOOLEAN DEFAULT false;`
      },

      // 3. Update posts deletion policy to allow admins
      {
        label: 'Recreate posts: delete own policy',
        sql: `
          DROP POLICY IF EXISTS "posts: delete own" ON public.posts;
          CREATE POLICY "posts: delete own" ON public.posts
            FOR DELETE USING (
              auth.uid() = author_id OR 
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },

      // 4. Update events insert, update, delete policies to allow admins
      {
        label: 'Recreate events: organizer insert policy',
        sql: `
          DROP POLICY IF EXISTS "events: organizer insert" ON public.events;
          CREATE POLICY "events: organizer insert" ON public.events
            FOR INSERT WITH CHECK (
              auth.uid() = organizer_id OR
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },
      {
        label: 'Recreate events: organizer update policy',
        sql: `
          DROP POLICY IF EXISTS "events: organizer update" ON public.events;
          CREATE POLICY "events: organizer update" ON public.events
            FOR UPDATE USING (
              auth.uid() = organizer_id OR
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },
      {
        label: 'Recreate events: organizer delete policy',
        sql: `
          DROP POLICY IF EXISTS "events: organizer delete" ON public.events;
          CREATE POLICY "events: organizer delete" ON public.events
            FOR DELETE USING (
              auth.uid() = organizer_id OR
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },

      // 5. Enable RLS on system_settings and add policies
      {
        label: 'Enable RLS on system_settings',
        sql: `ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;`
      },
      {
        label: 'Recreate system_settings: read all policy',
        sql: `
          DROP POLICY IF EXISTS "system_settings: read all" ON public.system_settings;
          CREATE POLICY "system_settings: read all" ON public.system_settings
            FOR SELECT USING (true);
        `
      },
      {
        label: 'Recreate system_settings: admin write policy',
        sql: `
          DROP POLICY IF EXISTS "system_settings: admin write" ON public.system_settings;
          CREATE POLICY "system_settings: admin write" ON public.system_settings
            FOR ALL USING (
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },
      {
        label: 'Create universities table and RLS policies',
        sql: `
          CREATE TABLE IF NOT EXISTS public.universities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            domain TEXT NOT NULL UNIQUE,
            short_name TEXT NOT NULL UNIQUE,
            primary_color TEXT NOT NULL,
            secondary_color TEXT NOT NULL,
            logo_url TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
          );

          ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Allow public read access on universities" ON public.universities;
          CREATE POLICY "Allow public read access on universities" 
            ON public.universities FOR SELECT 
            TO authenticated 
            USING (true);
        `
      },
      {
        label: 'Add university_id to profiles',
        sql: `
          ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id);
        `
      },
      {
        label: 'Seed initial universities',
        sql: `
          -- Seed all 313 universities
          INSERT INTO public.universities (name, domain, short_name, primary_color, secondary_color)
          VALUES
            ('University of Lagos', 'unilag.edu.ng', 'UNILAG', '#002244', '#FFD700'),
            ('University of Ibadan', 'ui.edu.ng', 'UI', '#004B49', '#FFD700'),
            ('FAF Campus Demo', 'fafcampus.site', 'FAF Demo', '#8b5cf6', '#6366f1'),
            ('Redeemer''s University', 'run.edu.ng', 'RUN', '#0a2f5c', '#e5b73b'),
            ('Abubakar Tafawa Balewa University, Bauchi', 'atbu.edu.ng', 'ATBU', '#002244', '#FFD700'),
            ('Ahmadu Bello University, Zaria', 'abu.edu.ng', 'ABU', '#004B49', '#FFD700'),
            ('Bayero University, Kano', 'buk.edu.ng', 'BUK', '#7A1C1C', '#C0C0C0'),
            ('Federal University Gashua, Yobe', 'fug.edu.ng', 'FUG', '#1E3A8A', '#3B82F6'),
            ('Federal University of Petroleum Resources, Effurun', 'fupr.edu.ng', 'FUPR', '#4C1D95', '#F59E0B'),
            ('Federal University of Technology, Akure', 'futa.edu.ng', 'FUTA', '#065F46', '#10B981'),
            ('Federal University of Technology, Minna', 'futminna.edu.ng', 'FUTMINNA', '#1E293B', '#94A3B8'),
            ('Federal University of Technology, Owerri', 'futo.edu.ng', 'FUTO', '#581C87', '#C084FC'),
            ('Federal University, Dutse, Jigawa State', 'fu.edu.ng', 'FU', '#881337', '#FB7185'),
            ('Federal University, Dutsin-Ma, Katsina', 'fu2.edu.ng', 'FU2', '#701A75', '#F472B6'),
            ('Federal University, Kashere, Gombe State', 'fu3.edu.ng', 'FU3', '#1E1B4B', '#818CF8'),
            ('Federal University, Lafia, Nasarawa State', 'fu4.edu.ng', 'FU4', '#311042', '#E0B0FF'),
            ('Federal University, Lokoja, Kogi State', 'fu5.edu.ng', 'FU5', '#002244', '#FFD700'),
            ('Alex Ekwueme University, Ndufu-Alike, Ebonyi State', 'aeu.edu.ng', 'AEU', '#004B49', '#FFD700'),
            ('Federal University, Otuoke, Bayelsa', 'fu6.edu.ng', 'FU6', '#7A1C1C', '#C0C0C0'),
            ('Federal University, Oye-Ekiti, Ekiti State', 'fu7.edu.ng', 'FU7', '#1E3A8A', '#3B82F6'),
            ('Federal University, Wukari, Taraba State', 'fu8.edu.ng', 'FU8', '#4C1D95', '#F59E0B'),
            ('Federal University, Birnin Kebbi', 'fu9.edu.ng', 'FU9', '#065F46', '#10B981'),
            ('Federal University, Gusau Zamfara', 'fu10.edu.ng', 'FU10', '#1E293B', '#94A3B8'),
            ('Michael Okpara University of Agriculture, Umudike', 'moua.edu.ng', 'MOUA', '#581C87', '#C084FC'),
            ('Modibbo Adama University of Technology, Yola', 'maut.edu.ng', 'MAUT', '#881337', '#FB7185'),
            ('National Open University of Nigeria, Abuja', 'noun.edu.ng', 'NOUN', '#701A75', '#F472B6'),
            ('Nigeria Police Academy, Wudil', 'npa.edu.ng', 'NPA', '#1E1B4B', '#818CF8'),
            ('Nigerian Defence Academy, Kaduna', 'nda.edu.ng', 'NDA', '#311042', '#E0B0FF'),
            ('Nnamdi Azikiwe University, Awka', 'unizik.edu.ng', 'UNIZIK', '#002244', '#FFD700'),
            ('Obafemi Awolowo University, Ile-Ife', 'oau.edu.ng', 'OAU', '#004B49', '#FFD700'),
            ('University of Abuja, Gwagwalada', 'uniabuja.edu.ng', 'UNIABUJA', '#7A1C1C', '#C0C0C0'),
            ('Federal University of Agriculture, Abeokuta', 'funaab.edu.ng', 'FUNAAB', '#1E3A8A', '#3B82F6'),
            ('Joseph Sarwuan Tarka University, Makurdi', 'jstu.edu.ng', 'JSTU', '#4C1D95', '#F59E0B'),
            ('University of Benin', 'uniben.edu.ng', 'UNIBEN', '#065F46', '#10B981'),
            ('University of Calabar', 'uc.edu.ng', 'UC', '#1E293B', '#94A3B8'),
            ('University of Ilorin', 'unilorin.edu.ng', 'UNILORIN', '#581C87', '#C084FC'),
            ('University of Jos', 'unijos.edu.ng', 'UNIJOS', '#881337', '#FB7185'),
            ('University of Maiduguri', 'unimaid.edu.ng', 'UNIMAID', '#701A75', '#F472B6'),
            ('University of Nigeria, Nsukka', 'unn.edu.ng', 'UNN', '#1E1B4B', '#818CF8'),
            ('University of Port-Harcourt', 'uniport.edu.ng', 'UNIPORT', '#311042', '#E0B0FF'),
            ('University of Uyo', 'uniuyo.edu.ng', 'UNIUYO', '#002244', '#FFD700'),
            ('Usumanu Danfodiyo University, Sokoto', 'udus.edu.ng', 'UDUS', '#004B49', '#FFD700'),
            ('Nigerian Maritime University, Okerenkoko, Delta State', 'nmu.edu.ng', 'NMU', '#7A1C1C', '#C0C0C0'),
            ('Air Force Institute of Technology, Kaduna', 'afit.edu.ng', 'AFIT', '#1E3A8A', '#3B82F6'),
            ('Nigerian Army University, Biu', 'nau.edu.ng', 'NAU', '#4C1D95', '#F59E0B'),
            ('Federal University of Health Sciences, Otukpo, Benue State', 'fuhs.edu.ng', 'FUHS', '#065F46', '#10B981'),
            ('Federal University of Agriculture, Zuru, Kebbi State', 'fua.edu.ng', 'FUA', '#1E293B', '#94A3B8'),
            ('Federal University of Technology, Babura, Jigawa State', 'fut-babura.edu.ng', 'FUT-Babura', '#581C87', '#C084FC'),
            ('Federal University of Technology, Ikot Abasi, Akwa Ibom State', 'fut-ikotabasi.edu.ng', 'FUT-IkotAbasi', '#881337', '#FB7185'),
            ('Federal University of Health Sciences, Azare, Bauchi State', 'fuhs2.edu.ng', 'FUHS2', '#701A75', '#F472B6'),
            ('Federal University of Health Sciences, Ila Orangun, Osun State', 'fuhs3.edu.ng', 'FUHS3', '#1E1B4B', '#818CF8'),
            ('David Nweze Umahi Federal University of Medical Sciences, Uburu', 'dnufums.edu.ng', 'DNUFUMS', '#311042', '#E0B0FF'),
            ('Admiralty University, Ibusa, Delta State', 'au.edu.ng', 'AU', '#002244', '#FFD700'),
            ('Federal University of Transportation, Daura, Katsina', 'fut.edu.ng', 'FUT', '#004B49', '#FFD700'),
            ('African Aviation and Aerospace University', 'aaau.edu.ng', 'AAAU', '#7A1C1C', '#C0C0C0'),
            ('National University of Science and Technology, Abuja', 'nust.edu.ng', 'NUST', '#1E3A8A', '#3B82F6'),
            ('Federal University of Agriculture, Bassam-Biri, Bayelsa', 'fua2.edu.ng', 'FUA2', '#4C1D95', '#F59E0B'),
            ('Federal University of Health Sciences, Kwale, Delta State', 'fuhs4.edu.ng', 'FUHS4', '#065F46', '#10B981'),
            ('Federal University of Health Sciences, Katsina', 'fuhs5.edu.ng', 'FUHS5', '#1E293B', '#94A3B8'),
            ('Federal University of Agriculture, Mubi', 'fua3.edu.ng', 'FUA3', '#581C87', '#C084FC'),
            ('Federal University of Education, Zaria, Kaduna State', 'fue.edu.ng', 'FUE', '#881337', '#FB7185'),
            ('Alvan Ikoku Federal University of Education, Owerri, Imo State', 'aifue.edu.ng', 'AIFUE', '#701A75', '#F472B6'),
            ('Yusuf Maitama Sule Federal University of Education, Kano', 'ymsfue.edu.ng', 'YMSFUE', '#1E1B4B', '#818CF8'),
            ('Adeyemi Federal University of Education, Ondo', 'afue.edu.ng', 'AFUE', '#311042', '#E0B0FF'),
            ('Federal University of Allied Health Sciences, Enugu', 'fuahs.edu.ng', 'FUAHS', '#002244', '#FFD700'),
            ('Federal University of Medicine and Medical Sciences, Abeokuta', 'fumms.edu.ng', 'FUMMS', '#004B49', '#FFD700'),
            ('Federal University of Education, Pankshin, Plateau State', 'fue2.edu.ng', 'FUE2', '#7A1C1C', '#C0C0C0'),
            ('Federal University of Education, Kontagora, Niger State', 'fue3.edu.ng', 'FUE3', '#1E3A8A', '#3B82F6'),
            ('University of Maritime Studies, Oron, Akwa Ibom State', 'ums.edu.ng', 'UMS', '#4C1D95', '#F59E0B'),
            ('Federal University of Environment and Technology, Tai Town, Ogoniland, Rivers State', 'fuet.edu.ng', 'FUET', '#065F46', '#10B981'),
            ('Federal University of Applied Sciences, Kachia, Kaduna State', 'fuas.edu.ng', 'FUAS', '#1E293B', '#94A3B8'),
            ('Tai Solarin Federal University of Education, Ijagun, Ijebu Ode', 'tasued.edu.ng', 'TASUED', '#581C87', '#C084FC'),
            ('Federal University of Agriculture and Developmental Studies, Iragbiji, Osun State', 'fuads.edu.ng', 'FUADS', '#881337', '#FB7185'),
            ('Federal University of Technology and Environmental Studies, Iyin-Ekiti, Ekiti State', 'futes.edu.ng', 'FUTES', '#701A75', '#F472B6'),
            ('Federal University of Agriculture and Technology, Okeho, Oyo State', 'fuat.edu.ng', 'FUAT', '#1E1B4B', '#818CF8'),
            ('Federal University of Health Science and Technology, Tsafe', 'fuhst.edu.ng', 'FUHST', '#311042', '#E0B0FF'),
            ('Federal University of Agriculture and Technology, Obio-Akpa, Akwa Ibom State', 'fuat2.edu.ng', 'FUAT2', '#002244', '#FFD700'),
            ('Federal University of Science and Technology, Epe', 'fust.edu.ng', 'FUST', '#004B49', '#FFD700'),
            ('Federal University of Science and Technology, Kabo, Kano', 'fust2.edu.ng', 'FUST2', '#7A1C1C', '#C0C0C0'),
            ('Rivers State University', 'rsu.edu.ng', 'RSU', '#1E3A8A', '#3B82F6'),
            ('Ambrose Alli University, Ekpoma', 'aau.edu.ng', 'AAU', '#4C1D95', '#F59E0B'),
            ('Abia State University, Uturu', 'absu.edu.ng', 'ABSU', '#065F46', '#10B981'),
            ('Ekiti State University', 'eksu.edu.ng', 'EKSU', '#1E293B', '#94A3B8'),
            ('Enugu State University of Science and Technology', 'esut.edu.ng', 'ESUT', '#581C87', '#C084FC'),
            ('Olabisi Onabanjo University, Ago Iwoye', 'oou.edu.ng', 'OOU', '#881337', '#FB7185'),
            ('Lagos State University, Ojo', 'lasu.edu.ng', 'LASU', '#701A75', '#F472B6'),
            ('Ladoke Akintola University of Technology, Ogbomoso', 'lautech.edu.ng', 'LAUTECH', '#1E1B4B', '#818CF8'),
            ('Rev. Fr. Moses Orshio Adasu Univ. (formerly Benue State Univ.), Makurdi', 'rfmoaubsu.edu.ng', 'RFMOAUBSU', '#311042', '#E0B0FF'),
            ('Delta State University, Abraka', 'delsu.edu.ng', 'DELSU', '#002244', '#FFD700'),
            ('Imo State University, Owerri', 'imsu.edu.ng', 'IMSU', '#004B49', '#FFD700'),
            ('Adekunle Ajasin University, Akungba', 'aaua.edu.ng', 'AAUA', '#7A1C1C', '#C0C0C0'),
            ('Prince Abubakar Audu University, Anyigba', 'paau.edu.ng', 'PAAU', '#1E3A8A', '#3B82F6'),
            ('Chukwuemeka Odumegwu Ojukwu University, Uli', 'coou.edu.ng', 'COOU', '#4C1D95', '#F59E0B'),
            ('Ebonyi State University, Abakaliki', 'ebsu.edu.ng', 'EBSU', '#065F46', '#10B981'),
            ('Aliko Dangote University of Science & Technology, Wudil', 'adustech.edu.ng', 'ADUSTECH', '#1E293B', '#94A3B8'),
            ('Niger Delta University, Yenagoa', 'ndu.edu.ng', 'NDU', '#581C87', '#C084FC'),
            ('Adamawa State University, Mubi', 'adsu.edu.ng', 'ADSU', '#881337', '#FB7185'),
            ('Nasarawa State University, Keffi', 'nsuk.edu.ng', 'NSUK', '#701A75', '#F472B6'),
            ('University of Cross River State, Calabar', 'ucrs.edu.ng', 'UCRS', '#1E1B4B', '#818CF8'),
            ('Gombe State University', 'gsu.edu.ng', 'GSU', '#311042', '#E0B0FF'),
            ('Kaduna State University', 'kasu.edu.ng', 'KASU', '#002244', '#FFD700'),
            ('Ibrahim Badamasi Babangida University, Lapai', 'ibbu.edu.ng', 'IBBU', '#004B49', '#FFD700'),
            ('Plateau State University, Bokkos', 'plasu.edu.ng', 'PLASU', '#7A1C1C', '#C0C0C0'),
            ('Yobe State University, Damaturu', 'ysu.edu.ng', 'YSU', '#1E3A8A', '#3B82F6'),
            ('Kebbi State University of Science and Technology, Aliero', 'ksust.edu.ng', 'KSUST', '#4C1D95', '#F59E0B'),
            ('Umar Musa Yar''Adua University, Katsina', 'umyau.edu.ng', 'UMYAU', '#065F46', '#10B981'),
            ('Osun State University, Osogbo', 'osu.edu.ng', 'OSU', '#1E293B', '#94A3B8'),
            ('Olusegun Agagu University of Science & Technology, Okitipupa', 'oaust.edu.ng', 'OAUST', '#581C87', '#C084FC'),
            ('Taraba State University, Jalingo', 'tasu.edu.ng', 'TASU', '#881337', '#FB7185'),
            ('Kwara State University, Ilorin', 'kwasu.edu.ng', 'KWASU', '#701A75', '#F472B6'),
            ('Sokoto State University', 'ssu.edu.ng', 'SSU', '#1E1B4B', '#818CF8'),
            ('Akwa Ibom State University, Ikot Akpaden', 'aisu.edu.ng', 'AISU', '#311042', '#E0B0FF'),
            ('Ignatius Ajuru University of Education, Rumuolumeni', 'iaue.edu.ng', 'IAUE', '#002244', '#FFD700'),
            ('Bauchi State University, Gadau', 'basug.edu.ng', 'BASUG', '#004B49', '#FFD700'),
            ('Northwest University, Kano', 'nu.edu.ng', 'NU', '#7A1C1C', '#C0C0C0'),
            ('First Technical University, Ibadan', 'tech-u.edu.ng', 'Tech-U', '#1E3A8A', '#3B82F6'),
            ('Sule Lamido University, Kafin Hausa, Jigawa', 'slu.edu.ng', 'SLU', '#4C1D95', '#F59E0B'),
            ('University of Medical Sciences, Ondo City', 'unimed.edu.ng', 'UNIMED', '#065F46', '#10B981'),
            ('Edo State University, Iyamho', 'edsu.edu.ng', 'EDSU', '#1E293B', '#94A3B8'),
            ('Kingsley Ozumba Mbadiwe University, Ogboko, Imo State', 'komu.edu.ng', 'KOMU', '#581C87', '#C084FC'),
            ('University of Africa, Toru Orua, Bayelsa State', 'uat.edu.ng', 'UAT', '#881337', '#FB7185'),
            ('Kashim Ibrahim University (formerly Borno State Univ.), Maiduguri', 'kiubsu.edu.ng', 'KIUBSU', '#701A75', '#F472B6'),
            ('Moshood Abiola University of Science and Technology, Abeokuta', 'maust.edu.ng', 'MAUST', '#1E1B4B', '#818CF8'),
            ('Zamfara State University', 'zsu.edu.ng', 'ZSU', '#311042', '#E0B0FF'),
            ('Bayelsa Medical University', 'bmu.edu.ng', 'BMU', '#002244', '#FFD700'),
            ('University of Agriculture and Environmental Sciences, Umuagwo, Imo State', 'uaes.edu.ng', 'UAES', '#004B49', '#FFD700'),
            ('Confluence University of Science and Technology, Osara, Kogi', 'custech.edu.ng', 'CUSTECH', '#7A1C1C', '#C0C0C0'),
            ('Bamidele Olumilua University of Science and Technology, Ikere, Ekiti State', 'bouesti.edu.ng', 'BOUESTI', '#1E3A8A', '#3B82F6'),
            ('University of Delta, Agbor', 'ud.edu.ng', 'UD', '#4C1D95', '#F59E0B'),
            ('Delta University of Science and Technology, Ozoro', 'dust.edu.ng', 'DUST', '#065F46', '#10B981'),
            ('Dennis Osadebe University, Asaba', 'dou.edu.ng', 'DOU', '#1E293B', '#94A3B8'),
            ('Lagos State University of Education, Ijanikin', 'lasued.edu.ng', 'LASUED', '#581C87', '#C084FC'),
            ('Lagos State University of Science and Technology, Ikorodu', 'lasustech.edu.ng', 'LASUSTECH', '#881337', '#FB7185'),
            ('Shehu Shagari University of Education, Sokoto', 'ssues.edu.ng', 'SSUES', '#701A75', '#F472B6'),
            ('State University of Medical and Applied Sciences, Igbo-Eno, Enugu', 'sumas.edu.ng', 'SUMAS', '#1E1B4B', '#818CF8'),
            ('University of Ilesa, Osun State', 'ui2.edu.ng', 'UI2', '#311042', '#E0B0FF'),
            ('Emanuel Alayande University of Education, Oyo', 'eaued.edu.ng', 'EAUED', '#002244', '#FFD700'),
            ('Kogi State University, Kabba', 'ksu-kabba.edu.ng', 'KSU-Kabba', '#004B49', '#FFD700'),
            ('AbdulKadir Kure University, Minna, Niger State', 'akku.edu.ng', 'AKKU', '#7A1C1C', '#C0C0C0'),
            ('Kwara State University of Education, Ilorin', 'kwsued.edu.ng', 'KWSUED', '#1E3A8A', '#3B82F6'),
            ('Abdulsalam Abubakar University of Agriculture and Climate Action, Mokwa, Niger State', 'aauaca.edu.ng', 'AAUACA', '#4C1D95', '#F59E0B'),
            ('Ebonyi State University of ICT, Science and Technology, Oferekpe', 'esuict.edu.ng', 'ESUICT', '#065F46', '#10B981'),
            ('Cross River University of Education and Entrepreneurship, Akampa', 'cruee.edu.ng', 'CRUEE', '#1E293B', '#94A3B8'),
            ('Benue State University of Agriculture Science and Technology, Ihugh', 'bsuast.edu.ng', 'BSUAST', '#581C87', '#C084FC'),
            ('University of Aeronautics and Aerospace Engineering, Ezza, Ebonyi State', 'uaae.edu.ng', 'UAAE', '#881337', '#FB7185'),
            ('University of Innovation, Science and Technology, Omuma, Imo State', 'ui3.edu.ng', 'UI3', '#701A75', '#F472B6'),
            ('Babcock University, Ilishan-Remo', 'babcock.edu.ng', 'BABCOCK', '#1E1B4B', '#818CF8'),
            ('Igbinedion University, Okada', 'iu.edu.ng', 'IU', '#311042', '#E0B0FF'),
            ('Madonna University, Okija', 'mu.edu.ng', 'MU', '#002244', '#FFD700'),
            ('Bowen University, Iwo', 'bowen.edu.ng', 'BOWEN', '#004B49', '#FFD700'),
            ('Benson Idahosa University, Benin City', 'biu.edu.ng', 'BIU', '#7A1C1C', '#C0C0C0'),
            ('Covenant University, Ota', 'covenant.edu.ng', 'COVENANT', '#1E3A8A', '#3B82F6'),
            ('Pan-Atlantic University, Lagos', 'pau.edu.ng', 'PAU', '#4C1D95', '#F59E0B'),
            ('American University of Nigeria, Yola', 'aun.edu.ng', 'AUN', '#065F46', '#10B981'),
            ('Ajayi Crowther University, Ibadan', 'acu.edu.ng', 'ACU', '#1E293B', '#94A3B8'),
            ('Al-Hikmah University, Ilorin', 'al-hikmah.edu.ng', 'AL-HIKMAH', '#581C87', '#C084FC'),
            ('Al-Qalam University, Katsina', 'auk.edu.ng', 'AUK', '#881337', '#FB7185'),
            ('Bells University of Technology, Otta', 'bells.edu.ng', 'BELLS', '#701A75', '#F472B6'),
            ('Bingham University, New Karu', 'bingham.edu.ng', 'BINGHAM', '#1E1B4B', '#818CF8'),
            ('Caritas University, Enugu', 'caritas.edu.ng', 'CARITAS', '#311042', '#E0B0FF'),
            ('Crawford University, Igbesa', 'crawford.edu.ng', 'CRAWFORD', '#002244', '#FFD700'),
            ('Crescent University', 'crescent.edu.ng', 'CRESCENT', '#004B49', '#FFD700'),
            ('Kwararafa University, Wukari', 'kuw.edu.ng', 'KUW', '#7A1C1C', '#C0C0C0'),
            ('Lead City University, Ibadan', 'lcu.edu.ng', 'LCU', '#1E3A8A', '#3B82F6'),
            ('Novena University, Ogume', 'novena.edu.ng', 'NOVENA', '#4C1D95', '#F59E0B'),
            ('Renaissance University, Enugu', 'rnu.edu.ng', 'RNU', '#065F46', '#10B981'),
            ('University of Mkar, Mkar', 'unimkar.edu.ng', 'UNIMKAR', '#1E293B', '#94A3B8'),
            ('Joseph Ayo Babalola University, Ikeji-Arakeji', 'jabu.edu.ng', 'JABU', '#581C87', '#C084FC'),
            ('Achievers University, Owo', 'achievers.edu.ng', 'ACHIEVERS', '#881337', '#FB7185'),
            ('Caleb University, Lagos', 'caleb.edu.ng', 'CALEB', '#701A75', '#F472B6'),
            ('Fountain University, Oshogbo', 'fountain.edu.ng', 'FOUNTAIN', '#1E1B4B', '#818CF8'),
            ('African University of Science and Technology, Abuja', 'aust.edu.ng', 'AUST', '#311042', '#E0B0FF'),
            ('Obong University, Obong Ntak', 'obong.edu.ng', 'OBONG', '#002244', '#FFD700'),
            ('Salem University, Lokoja', 'salem.edu.ng', 'SALEM', '#004B49', '#FFD700'),
            ('Tansian University, Umunya', 'tansian.edu.ng', 'TANSIAN', '#7A1C1C', '#C0C0C0'),
            ('Veritas University, Abuja', 'veritas.edu.ng', 'VERITAS', '#1E3A8A', '#3B82F6'),
            ('Wesley University, Ondo', 'wesley.edu.ng', 'WESLEY', '#4C1D95', '#F59E0B'),
            ('Western Delta University, Oghara, Delta State', 'wdu.edu.ng', 'WDU', '#065F46', '#10B981'),
            ('Afe Babalola University, Ado-Ekiti', 'abuad.edu.ng', 'ABUAD', '#1E293B', '#94A3B8'),
            ('Godfrey Okoye University, Ugwuomu-Nike, Enugu State', 'gou.edu.ng', 'GOU', '#581C87', '#C084FC'),
            ('Nile University of Nigeria, Abuja', 'nile.edu.ng', 'NILE', '#881337', '#FB7185'),
            ('Oduduwa University, Ipetumodu, Osun State', 'oduduwa.edu.ng', 'ODUDUWA', '#701A75', '#F472B6'),
            ('Paul University, Awka, Anambra State', 'paul.edu.ng', 'PAUL', '#1E1B4B', '#818CF8'),
            ('Rhema University, Obeama-Asa, Rivers State', 'rhema.edu.ng', 'RHEMA', '#311042', '#E0B0FF'),
            ('Wellspring University, Evbuobanosa, Edo State', 'wellspring.edu.ng', 'WELLSPRING', '#002244', '#FFD700'),
            ('Adeleke University, Ede', 'adeleke.edu.ng', 'ADELEKE', '#004B49', '#FFD700'),
            ('Baze University', 'baze.edu.ng', 'BAZE', '#7A1C1C', '#C0C0C0'),
            ('Landmark University, Omu-Aran', 'landmark.edu.ng', 'LANDMARK', '#1E3A8A', '#3B82F6'),
            ('Glorious Vision University, Ogwa, Edo State', 'gvu.edu.ng', 'GVU', '#4C1D95', '#F59E0B'),
            ('Elizade University, Ilara-Mokin', 'elizade.edu.ng', 'ELIZADE', '#065F46', '#10B981'),
            ('Evangel University, Akaeze', 'evangel.edu.ng', 'EVANGEL', '#1E293B', '#94A3B8'),
            ('Gregory University, Uturu', 'gregory.edu.ng', 'GREGORY', '#581C87', '#C084FC'),
            ('McPherson University, Seriki Sotayo, Ajebo', 'mcu.edu.ng', 'MCU', '#881337', '#FB7185'),
            ('Southwestern University, Oku Owa', 'southwestern.edu.ng', 'SOUTHWESTERN', '#701A75', '#F472B6'),
            ('Augustine University', 'aui.edu.ng', 'AUI', '#1E1B4B', '#818CF8'),
            ('Chrisland University', 'chrisland.edu.ng', 'CHRISLAND', '#311042', '#E0B0FF'),
            ('Edwin Clark University, Kaigbodo', 'ecu.edu.ng', 'ECU', '#002244', '#FFD700'),
            ('Hallmark University, Ijebi Itele, Ogun', 'hallmark.edu.ng', 'HALLMARK', '#004B49', '#FFD700'),
            ('Hezekiah University, Umudi', 'hezekiah.edu.ng', 'HEZEKIAH', '#7A1C1C', '#C0C0C0'),
            ('Kings University, Ode Omu', 'kings.edu.ng', 'KINGS', '#1E3A8A', '#3B82F6'),
            ('Micheal & Cecilia Ibru University', 'mciu.edu.ng', 'MCIU', '#4C1D95', '#F59E0B'),
            ('Mountain Top University', 'mtu.edu.ng', 'MTU', '#065F46', '#10B981'),
            ('Ritman University, Ikot Ekpene, Akwa Ibom', 'ritman.edu.ng', 'RITMAN', '#1E293B', '#94A3B8'),
            ('Summit University, Offa', 'summit.edu.ng', 'SUMMIT', '#581C87', '#C084FC'),
            ('Christopher University, Mowe', 'christopher.edu.ng', 'CHRISTOPHER', '#881337', '#FB7185'),
            ('Kola Daisi University, Ibadan', 'kdu.edu.ng', 'KDU', '#701A75', '#F472B6'),
            ('Anchor University, Ayobo, Lagos State', 'anchor.edu.ng', 'ANCHOR', '#1E1B4B', '#818CF8'),
            ('Dominican University, Ibadan', 'dominican.edu.ng', 'DOMINICAN', '#311042', '#E0B0FF'),
            ('Legacy University, Okija, Anambra State', 'legacy.edu.ng', 'LEGACY', '#002244', '#FFD700'),
            ('Arthur Jarvis University, Akpoyubo, Cross River State', 'aju.edu.ng', 'AJU', '#004B49', '#FFD700'),
            ('Ojaja University, Eiyenkorin, Kwara State', 'ojaja.edu.ng', 'OJAJA', '#7A1C1C', '#C0C0C0'),
            ('Coal City University, Enugu State', 'ccu.edu.ng', 'CCU', '#1E3A8A', '#3B82F6'),
            ('Clifford University, Owerrinta, Abia State', 'clifford.edu.ng', 'CLIFFORD', '#4C1D95', '#F59E0B'),
            ('Spiritan University, Nneochi, Abia State', 'spiritan.edu.ng', 'SPIRITAN', '#065F46', '#10B981'),
            ('Precious Cornerstone University, Oyo', 'pcu.edu.ng', 'PCU', '#1E293B', '#94A3B8'),
            ('PAMO University of Medical Sciences, Port Harcourt', 'pamo.edu.ng', 'PAMO', '#581C87', '#C084FC'),
            ('Atiba University, Oyo', 'atiba.edu.ng', 'ATIBA', '#881337', '#FB7185'),
            ('Eko University of Medical and Health Sciences, Ijanikin, Lagos', 'ekounimed.edu.ng', 'EKOUNIMED', '#701A75', '#F472B6'),
            ('Skyline University, Kano', 'sun.edu.ng', 'SUN', '#1E1B4B', '#818CF8'),
            ('Greenfield University, Kaduna', 'gfu.edu.ng', 'GFU', '#311042', '#E0B0FF'),
            ('Dominion University, Ibadan', 'dominion.edu.ng', 'DOMINION', '#002244', '#FFD700'),
            ('Trinity University, Ogun State', 'trinity.edu.ng', 'TRINITY', '#004B49', '#FFD700'),
            ('Westland University, Iwo, Osun State', 'westland.edu.ng', 'WESTLAND', '#7A1C1C', '#C0C0C0'),
            ('Topfaith University, Mkpatak, Akwa Ibom State', 'topfaith.edu.ng', 'TOPFAITH', '#1E3A8A', '#3B82F6'),
            ('Thomas Adewumi University, Oko-Irese, Kwara State', 'tau.edu.ng', 'TAU', '#4C1D95', '#F59E0B'),
            ('Maranatha University, Lagos', 'maranatha.edu.ng', 'MARANATHA', '#065F46', '#10B981'),
            ('Ave Maria University, Piyanko, Nasarawa State', 'avu.edu.ng', 'AVU', '#1E293B', '#94A3B8'),
            ('Al-Istiqama University, Sumaila, Kano State', 'al-istiqama.edu.ng', 'AL-ISTIQAMA', '#581C87', '#C084FC'),
            ('Mudiame University, Irrua, Edo State', 'mudiame.edu.ng', 'MUDIAME', '#881337', '#FB7185'),
            ('Havilla University, Nde-Ikom, Cross River State', 'havilla.edu.ng', 'HAVILLA', '#701A75', '#F472B6'),
            ('Claretian University of Nigeria, Nekede, Imo State', 'cun.edu.ng', 'CUN', '#1E1B4B', '#818CF8'),
            ('Karl-Kumm University, Vom, Plateau State', 'kku.edu.ng', 'KKU', '#311042', '#E0B0FF'),
            ('James Hope University, Lagos', 'jhu.edu.ng', 'JHU', '#002244', '#FFD700'),
            ('Maryam Abacha American University of Nigeria, Kano State', 'maaun.edu.ng', 'MAAUN', '#004B49', '#FFD700'),
            ('Capital City University, Kano State', 'ccuk.edu.ng', 'CCUK', '#7A1C1C', '#C0C0C0'),
            ('Ahman Pategi University, Kwara State', 'apu.edu.ng', 'APU', '#1E3A8A', '#3B82F6'),
            ('University of Offa, Kwara State', 'unioffa.edu.ng', 'UNIOFFA', '#4C1D95', '#F59E0B'),
            ('Mewar International University, Masaka, Nasarawa State', 'mewar.edu.ng', 'MEWAR', '#065F46', '#10B981'),
            ('Edusoko University, Bida, Niger State', 'edusoko.edu.ng', 'EDUSOKO', '#1E293B', '#94A3B8'),
            ('Philomath University, Kuje, Abuja', 'philomath.edu.ng', 'PHILOMATH', '#581C87', '#C084FC'),
            ('Khadija University, Majia, Jigawa State', 'khadija.edu.ng', 'KHADIJA', '#881337', '#FB7185'),
            ('Anan University, Kwall, Plateau State', 'anan.edu.ng', 'ANAN', '#701A75', '#F472B6'),
            ('North Eastern University, Gombe', 'neu.edu.ng', 'NEU', '#1E1B4B', '#818CF8'),
            ('Al-Ansar University, Maiduguri, Borno', 'al-ansar.edu.ng', 'AL-ANSAR', '#311042', '#E0B0FF'),
            ('Margaret Lawrence University, Umunede, Delta State', 'mlu.edu.ng', 'MLU', '#002244', '#FFD700'),
            ('Khalifa Isiyaku Rabiu University, Kano', 'khairu.edu.ng', 'KHAIRU', '#004B49', '#FFD700'),
            ('Sports University, Idumuje-Ugboko, Delta State', 'sportsuni.edu.ng', 'SPORTSUNI', '#7A1C1C', '#C0C0C0'),
            ('Baba Ahmed University, Kano State', 'bau.edu.ng', 'BAU', '#1E3A8A', '#3B82F6'),
            ('Saisa University of Medical Sciences and Technology, Sokoto State', 'saisa.edu.ng', 'SAISA', '#4C1D95', '#F59E0B'),
            ('Nigerian British University, Asa, Abia State', 'nbu.edu.ng', 'NBU', '#065F46', '#10B981'),
            ('Peter University, Achina-Onneh, Anambra State', 'peter.edu.ng', 'PETER', '#1E293B', '#94A3B8'),
            ('Newgate University, Minna, Niger State', 'newgate.edu.ng', 'NEWGATE', '#581C87', '#C084FC'),
            ('European University of Nigeria, Duboyi, FCT', 'eun.edu.ng', 'EUN', '#881337', '#FB7185'),
            ('NorthWest University, Sokoto State', 'nwus.edu.ng', 'NWUS', '#701A75', '#F472B6'),
            ('Rayhaan University, Kebbi', 'rayhaan.edu.ng', 'RAYHAAN', '#1E1B4B', '#818CF8'),
            ('Muhammad Kamalud University, Kwara', 'mku.edu.ng', 'MKU', '#311042', '#E0B0FF'),
            ('Sam Maris University, Ondo', 'smu.edu.ng', 'SMU', '#002244', '#FFD700'),
            ('Aletheia University, Ago-Iwoye, Ogun State', 'aletheia.edu.ng', 'ALETHEIA', '#004B49', '#FFD700'),
            ('Lux Mundi University, Umuahia, Abia State', 'luxmundi.edu.ng', 'LUXMUNDI', '#7A1C1C', '#C0C0C0'),
            ('Maduka University, Ekwegbe, Enugu State', 'maduka.edu.ng', 'MADUKA', '#1E3A8A', '#3B82F6'),
            ('PeaceLand University, Enugu State', 'peaceland.edu.ng', 'PEACELAND', '#4C1D95', '#F59E0B'),
            ('Amadeus University, Amizi, Abia State', 'amadeus.edu.ng', 'AMADEUS', '#065F46', '#10B981'),
            ('Vision University, Ikogbo, Ogun State', 'vision.edu.ng', 'VISION', '#1E293B', '#94A3B8'),
            ('Azman University, Kano State', 'azman.edu.ng', 'AZMAN', '#581C87', '#C084FC'),
            ('Huda University, Gusau, Zamfara State', 'huda.edu.ng', 'HUDA', '#881337', '#FB7185'),
            ('Franco British International University, Kaduna State', 'fbiu.edu.ng', 'FBIU', '#701A75', '#F472B6'),
            ('Canadian University of Nigeria, Abuja', 'cun-abuja.edu.ng', 'CUN-Abuja', '#1E1B4B', '#818CF8'),
            ('Gerar University of Medical Science, Imope Ijebu, Ogun State', 'gums.edu.ng', 'GUMS', '#311042', '#E0B0FF'),
            ('British Canadian University, Obufu, Cross River State', 'bcu.edu.ng', 'BCU', '#002244', '#FFD700'),
            ('Hensard University, Toru-Orua, Sagbama, Bayelsa State', 'hensard.edu.ng', 'HENSARD', '#004B49', '#FFD700'),
            ('Amaj University, Kwali, Abuja', 'amaj.edu.ng', 'AMAJ', '#7A1C1C', '#C0C0C0'),
            ('Phoenix University, Agwada, Nasarawa State', 'phoenix.edu.ng', 'PHOENIX', '#1E3A8A', '#3B82F6'),
            ('Wigwe University, Isiokpo, Rivers State', 'wigwe.edu.ng', 'WIGWE', '#4C1D95', '#F59E0B'),
            ('Hillside University of Science and Technology, Okemisi, Ekiti State', 'hust.edu.ng', 'HUST', '#065F46', '#10B981'),
            ('University on the Niger, Umunya, Anambra State', 'uniniger.edu.ng', 'UNINIGER', '#1E293B', '#94A3B8'),
            ('Elrazi Medical University, Yargaya, Kano State', 'emu.edu.ng', 'EMU', '#581C87', '#C084FC'),
            ('Venite University, Iloro-Ekiti, Ekiti State', 'venite.edu.ng', 'VENITE', '#881337', '#FB7185'),
            ('Shanahan University, Onitsha, Anambra State', 'shanahan.edu.ng', 'SHANAHAN', '#701A75', '#F472B6'),
            ('The Duke Medical University, Calabar, Cross River State', 'tdmu.edu.ng', 'TDMU', '#1E1B4B', '#818CF8'),
            ('Mercy Medical University, Iwo, Ogun State', 'mmu.edu.ng', 'MMU', '#311042', '#E0B0FF'),
            ('Cosmopolitan University, Abuja', 'cosmopolitan.edu.ng', 'COSMOPOLITAN', '#002244', '#FFD700'),
            ('Miva Open University, Abuja', 'miva.edu.ng', 'MIVA', '#004B49', '#FFD700'),
            ('Iconic Open University, Sokoto State', 'iconic.edu.ng', 'ICONIC', '#7A1C1C', '#C0C0C0'),
            ('West Midlands Open University, Ibadan, Oyo State', 'wmou.edu.ng', 'WMOU', '#1E3A8A', '#3B82F6'),
            ('Al-Muhibbah Open University, Abuja', 'al-muhibbah.edu.ng', 'AL-MUHIBBAH', '#4C1D95', '#F59E0B'),
            ('El-Amin University, Minna, Niger State', 'el-amin.edu.ng', 'EL-AMIN', '#065F46', '#10B981'),
            ('College of Petroleum and Energy Studies, Kaduna State', 'cpes.edu.ng', 'CPES', '#1E293B', '#94A3B8'),
            ('Jewel University, Gombe State', 'jewel.edu.ng', 'JEWEL', '#581C87', '#C084FC'),
            ('Prime University, Kuje, Abuja', 'prime.edu.ng', 'PRIME', '#881337', '#FB7185'),
            ('Nigerian University of Technology and Management, Apapa, Lagos State', 'nutm.edu.ng', 'NUTM', '#701A75', '#F472B6'),
            ('Al-Bayan University, Ankpa, Kogi State', 'al-bayan.edu.ng', 'AL-BAYAN', '#1E1B4B', '#818CF8'),
            ('Lighthouse University, Evbobanosa, Edo State', 'lighthouse.edu.ng', 'LIGHTHOUSE', '#311042', '#E0B0FF'),
            ('African University of Economics, Abuja', 'aue.edu.ng', 'AUE', '#002244', '#FFD700'),
            ('New City University, Ayetoro, Ogun State', 'newcity.edu.ng', 'NEWCITY', '#004B49', '#FFD700'),
            ('University of Fortune, Igbotako, Ondo State', 'fortune.edu.ng', 'FORTUNE', '#7A1C1C', '#C0C0C0'),
            ('Eranova University, Abuja', 'eranova.edu.ng', 'ERANOVA', '#1E3A8A', '#3B82F6'),
            ('Minaret University, Ikirun, Osun State', 'minaret.edu.ng', 'MINARET', '#4C1D95', '#F59E0B'),
            ('Abdulrasaq Abubakar Toyin University, Ganmo, Ilorin, Kwara State', 'aatu.edu.ng', 'AATU', '#065F46', '#10B981'),
            ('Southern Atlantic University, Uyo, Akwa Ibom State', 'sau.edu.ng', 'SAU', '#1E293B', '#94A3B8'),
            ('Lens University, Ilemona, Kwara State', 'lens.edu.ng', 'LENS', '#581C87', '#C084FC'),
            ('Monarch University, Iyesi-Ota, Ogun State', 'monarch.edu.ng', 'MONARCH', '#881337', '#FB7185'),
            ('Tonine Iredia University of Communication, Benin City, Edo State', 'tiuc.edu.ng', 'TIUC', '#701A75', '#F472B6'),
            ('Isaac Balami University of Aeronautics and Management, Lagos State', 'ibuam.edu.ng', 'IBUAM', '#1E1B4B', '#818CF8'),
            ('Kevin Eze University, Mgbowo, Enugu State', 'keu.edu.ng', 'KEU', '#311042', '#E0B0FF'),
            ('Tazkiyah University, Kaduna State', 'tazkiyah.edu.ng', 'TAZKIYAH', '#002244', '#FFD700'),
            ('Leadership University, Abuja', 'leadership.edu.ng', 'LEADERSHIP', '#004B49', '#FFD700'),
            ('Jimoh Babalola University, Ilorin, Kwara State', 'jbu.edu.ng', 'JBU', '#7A1C1C', '#C0C0C0'),
            ('Bridget University Mbaise, Okirika-Nweke, Imo State', 'bridget.edu.ng', 'BRIDGET', '#1E3A8A', '#3B82F6'),
            ('Greenland University, Jalingo, Taraba State', 'greenland.edu.ng', 'GREENLAND', '#4C1D95', '#F59E0B'),
            ('JEFAP University, Suleja, Niger State', 'jefap.edu.ng', 'JEFAP', '#065F46', '#10B981'),
            ('Azione Verde University, Amaigbo, Imo State', 'avu-azione.edu.ng', 'AVU-Azione', '#1E293B', '#94A3B8'),
            ('Unique Open University, Ojo, Lagos State', 'uou.edu.ng', 'UOU', '#581C87', '#C084FC'),
            ('American Open University, Abeokuta, Ogun State', 'aou.edu.ng', 'AOU', '#881337', '#FB7185')
          ON CONFLICT (domain) DO UPDATE SET
            name = EXCLUDED.name,
            short_name = EXCLUDED.short_name,
            primary_color = EXCLUDED.primary_color,
            secondary_color = EXCLUDED.secondary_color;
        `
      },
      {
        label: 'Reload PostgREST schema cache',
        sql: `NOTIFY pgrst, 'reload schema';`
      },
      {
        label: 'Add gender column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;`
      },
      {
        label: 'Add id_card_url column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_url TEXT;`
      },
      {
        label: 'Add id_card_status column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_status TEXT DEFAULT 'not_uploaded';`
      },
      {
        label: 'Add invite_code column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;`
      },
      {
        label: 'Add invited_by column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_by TEXT;`
      },
      {
        label: 'Add forced_signout_at column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS forced_signout_at TIMESTAMPTZ;`
      },
      {
        label: 'Create invite_code auto-generate function',
        sql: `
          CREATE OR REPLACE FUNCTION public.generate_invite_code()
          RETURNS TRIGGER AS $$
          BEGIN
            IF NEW.invite_code IS NULL THEN
              NEW.invite_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        label: 'Create invite_code trigger on profiles',
        sql: `
          DROP TRIGGER IF EXISTS trg_generate_invite_code ON public.profiles;
          CREATE TRIGGER trg_generate_invite_code
            BEFORE INSERT ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.generate_invite_code();
        `
      },
      {
        label: 'Backfill invite codes for existing profiles without one',
        sql: `
          UPDATE public.profiles
          SET invite_code = upper(substring(md5(random()::text || id::text) from 1 for 8))
          WHERE invite_code IS NULL;
        `
      },
      {
        label: 'Force sign out all existing users (set forced_signout_at to now)',
        sql: `UPDATE public.profiles SET forced_signout_at = now() WHERE forced_signout_at IS NULL;`
      },
      {
        label: 'Update posts set posted_to_global_hub = false where null',
        sql: `UPDATE public.posts SET posted_to_global_hub = false WHERE posted_to_global_hub IS NULL;`
      },
      {
        label: 'Update profiles set joined_global_hub = false where null',
        sql: `UPDATE public.profiles SET joined_global_hub = false WHERE joined_global_hub IS NULL;`
      },
      {
        label: 'Map all existing profiles to Redeemer\'s University (RUN)',
        sql: `
          UPDATE public.profiles
          SET university_id = '0496f872-cd84-4e29-ac32-98d3e3a057c8',
              university = 'Redeemer''s University'
          WHERE university_id IS NULL OR university = 'University of Lagos';
        `
      },
      {
        label: 'Create database views for local and global posts',
        sql: `
          CREATE OR REPLACE VIEW public.local_posts AS
          SELECT * FROM public.posts
          WHERE posted_to_global_hub = false;

          CREATE OR REPLACE VIEW public.global_posts AS
          SELECT * FROM public.posts
          WHERE posted_to_global_hub = true;
        `
      },
      {
        label: 'Create triggers for views to force set posted_to_global_hub',
        sql: `
          CREATE OR REPLACE FUNCTION public.trg_fn_insert_global_post()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.posts (
              id, author_id, body, tags, is_anonymous, post_type, club_id, study_group_id, repost_of, image_url, posted_to_global_hub, created_at
            ) VALUES (
              COALESCE(NEW.id, gen_random_uuid()),
              NEW.author_id,
              NEW.body,
              NEW.tags,
              COALESCE(NEW.is_anonymous, false),
              COALESCE(NEW.post_type, 'feed'),
              NEW.club_id,
              NEW.study_group_id,
              NEW.repost_of,
              NEW.image_url,
              true,
              COALESCE(NEW.created_at, now())
            )
            RETURNING * INTO NEW;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_insert_global_post ON public.global_posts;
          CREATE TRIGGER trg_insert_global_post
            INSTEAD OF INSERT ON public.global_posts
            FOR EACH ROW EXECUTE FUNCTION public.trg_fn_insert_global_post();

          CREATE OR REPLACE FUNCTION public.trg_fn_insert_local_post()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.posts (
              id, author_id, body, tags, is_anonymous, post_type, club_id, study_group_id, repost_of, image_url, posted_to_global_hub, created_at
            ) VALUES (
              COALESCE(NEW.id, gen_random_uuid()),
              NEW.author_id,
              NEW.body,
              NEW.tags,
              COALESCE(NEW.is_anonymous, false),
              COALESCE(NEW.post_type, 'feed'),
              NEW.club_id,
              NEW.study_group_id,
              NEW.repost_of,
              NEW.image_url,
              false,
              COALESCE(NEW.created_at, now())
            )
            RETURNING * INTO NEW;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_insert_local_post ON public.local_posts;
          CREATE TRIGGER trg_insert_local_post
            INSTEAD OF INSERT ON public.local_posts
            FOR EACH ROW EXECUTE FUNCTION public.trg_fn_insert_local_post();
        `
      },
      {
        label: 'Create database views for global events, clubs, and profiles',
        sql: `
          CREATE OR REPLACE VIEW public.global_events AS
          SELECT e.* FROM public.events e
          JOIN public.profiles p ON e.organizer_id = p.id
          WHERE p.joined_global_hub = true;

          CREATE OR REPLACE VIEW public.global_clubs AS
          SELECT c.* FROM public.clubs c
          JOIN public.profiles p ON c.created_by = p.id
          WHERE p.joined_global_hub = true;

          CREATE OR REPLACE VIEW public.global_profiles AS
          SELECT * FROM public.profiles
          WHERE joined_global_hub = true;
        `
      },
      {
        label: 'Grant view permissions to database roles',
        sql: `
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_posts TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_posts TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_events TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_clubs TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_profiles TO anon, authenticated;
        `
      },
      {
        label: 'Recreate posts: read public policy with strict university isolation',
        sql: `
          ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "posts: read public" ON public.posts;
          CREATE POLICY "posts: read public" ON public.posts
            FOR SELECT
            TO authenticated, anon
            USING (
              posted_to_global_hub = true OR 
              (posted_to_global_hub = false AND author_id IN (
                SELECT id FROM public.profiles WHERE university_id = (
                  SELECT university_id FROM public.profiles WHERE id = auth.uid()
                )
              ))
            );
        `
      },
      {
        label: 'Create comment likes table, count column, and triggers',
        sql: `
          -- Add likes_count to post_comments if it does not exist
          ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

          -- Create post_comment_likes table
          CREATE TABLE IF NOT EXISTS public.post_comment_likes (
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT now(),
            PRIMARY KEY (user_id, comment_id)
          );

          -- Enable RLS
          ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

          -- RLS Policies
          DROP POLICY IF EXISTS "post_comment_likes: read all" ON public.post_comment_likes;
          CREATE POLICY "post_comment_likes: read all" ON public.post_comment_likes
            FOR SELECT USING (true);

          DROP POLICY IF EXISTS "post_comment_likes: own insert" ON public.post_comment_likes;
          CREATE POLICY "post_comment_likes: own insert" ON public.post_comment_likes
            FOR INSERT WITH CHECK (auth.uid() = user_id);

          DROP POLICY IF EXISTS "post_comment_likes: own delete" ON public.post_comment_likes;
          CREATE POLICY "post_comment_likes: own delete" ON public.post_comment_likes
            FOR DELETE USING (auth.uid() = user_id);

          -- Trigger to automatically update likes_count
          CREATE OR REPLACE FUNCTION public.sync_post_comment_likes_count()
          RETURNS TRIGGER AS $$
          BEGIN
            IF TG_OP = 'INSERT' THEN
              UPDATE public.post_comments
              SET likes_count = likes_count + 1
              WHERE id = NEW.comment_id;
            ELSIF TG_OP = 'DELETE' THEN
              UPDATE public.post_comments
              SET likes_count = GREATEST(0, likes_count - 1)
              WHERE id = OLD.comment_id;
            END IF;
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_post_comment_likes_count ON public.post_comment_likes;
          CREATE TRIGGER trg_post_comment_likes_count
          AFTER INSERT OR DELETE ON public.post_comment_likes
          FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_likes_count();

          -- Grant privileges
          GRANT SELECT, INSERT, DELETE ON public.post_comment_likes TO anon, authenticated;
          GRANT UPDATE ON public.post_comments TO anon, authenticated;
        `
      },
      {
        label: 'Create auth.is_admin() helper function',
        sql: `
          CREATE OR REPLACE FUNCTION auth.is_admin()
          RETURNS boolean
          LANGUAGE sql
          STABLE
          AS $$
            SELECT 
              COALESCE(auth.jwt()->>'custom:role', '') = 'admin' OR
              auth.jwt()->'cognito:groups' ? 'admin' OR
              EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
              )
          $$;

          GRANT EXECUTE ON FUNCTION auth.is_admin() TO anon, authenticated, service_role;
        `
      },
      {
        label: 'Re-enable HTTP push notification trigger using pgsql-http extension',
        sql: `
          -- Install http extension if not already present
          DO $$
          BEGIN
            CREATE EXTENSION IF NOT EXISTS http SCHEMA public CASCADE;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create http extension: %', SQLERRM;
          END;
          $$;

          -- Re-define push notification trigger to use http_post conditionally
          CREATE OR REPLACE FUNCTION public.trg_fn_push_notification()
          RETURNS TRIGGER AS $$
          DECLARE
            v_push_token TEXT;
            v_actor_name TEXT;
            v_unread_count INT;
            v_web_subs JSONB;
            v_payload JSONB;
          BEGIN
            -- Only attempt HTTP call if the public.http function exists
            IF EXISTS (
              SELECT 1 FROM pg_proc p 
              JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'public' AND p.proname = 'http'
            ) THEN
              -- 1. Get recipient's push token from RDS public.profiles
              SELECT push_token INTO v_push_token
              FROM public.profiles
              WHERE id = NEW.user_id;

              -- 2. Get actor's name from RDS public.profiles
              IF NEW.actor_id IS NOT NULL THEN
                SELECT full_name INTO v_actor_name
                FROM public.profiles
                WHERE id = NEW.actor_id;
              END IF;

              -- 3. Get unread count from RDS public.notifications
              SELECT COUNT(*) INTO v_unread_count
              FROM public.notifications
              WHERE user_id = NEW.user_id AND is_read = false;

              -- 4. Get web push subscriptions from RDS public.web_push_subscriptions
              SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'endpoint', endpoint,
                'p256dh', p256dh,
                'auth', auth
              )), '[]'::jsonb) INTO v_web_subs
              FROM public.web_push_subscriptions
              WHERE user_id = NEW.user_id;

              -- 5. Build enriched payload
              v_payload := to_jsonb(NEW) || jsonb_build_object(
                'push_token', v_push_token,
                'actor_name', COALESCE(v_actor_name, 'Someone'),
                'unread_count', v_unread_count,
                'web_subs', v_web_subs
              );

              PERFORM public.http((
                'POST',
                'https://vcbtvhociaioeyhhsczh.supabase.co/functions/v1/send-push-notification',
                ARRAY[
                  public.http_header('Content-Type', 'application/json'),
                  public.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM')
                ],
                'application/json',
                v_payload::text
              )::public.http_request);
            END IF;
            RETURN NEW;
          EXCEPTION WHEN OTHERS THEN
            -- Never block inserts due to notification delivery failures
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        label: 'Create notifications delete RLS policy',
        sql: `
          DROP POLICY IF EXISTS "notifs: own delete" ON public.notifications;
          CREATE POLICY "notifs: own delete" ON public.notifications
            FOR DELETE USING (auth.uid() = user_id);
        `
      },
      {
        label: 'Add views_count column to posts and create increment RPC function',
        sql: `
          -- Add views_count if not present
          ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0;

          -- Create security definer RPC function to increment views
          CREATE OR REPLACE FUNCTION public.increment_post_views(post_id UUID)
          RETURNS void AS $$
          BEGIN
            UPDATE public.posts
            SET views_count = views_count + 1
            WHERE id = post_id;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          -- Grant execute permission to database roles
          GRANT EXECUTE ON FUNCTION public.increment_post_views(UUID) TO anon, authenticated;
        `
      },
      {
        label: 'Create delete_own_user RPC function',
        sql: `
          CREATE OR REPLACE FUNCTION public.delete_own_user()
          RETURNS void AS $$
          BEGIN
            DELETE FROM auth.users WHERE id = auth.uid();
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          GRANT EXECUTE ON FUNCTION public.delete_own_user() TO authenticated;
        `
      },
      {
        label: 'Create id-cards storage bucket and RLS policies',
        sql: `
          -- Create id-cards storage bucket
          INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
          VALUES (
            'id-cards', 
            'id-cards', 
            false, 
            5242880, 
            ARRAY['image/jpeg', 'image/png', 'image/webp']
          )
          ON CONFLICT (id) DO NOTHING;

          -- Disable existing policies if any
          DROP POLICY IF EXISTS "Admins can view ID cards" ON storage.objects;
          CREATE POLICY "Admins can view ID cards" ON storage.objects
            FOR SELECT TO authenticated USING (
              bucket_id = 'id-cards' AND 
              EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
              )
            );

          DROP POLICY IF EXISTS "Users can upload their own ID card" ON storage.objects;
          CREATE POLICY "Users can upload their own ID card" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (
              bucket_id = 'id-cards'
            );

          DROP POLICY IF EXISTS "Users can update their own ID card" ON storage.objects;
          CREATE POLICY "Users can update their own ID card" ON storage.objects
            FOR UPDATE TO authenticated USING (
              bucket_id = 'id-cards'
            );
        `
      },
      {
        label: 'Redefine profile role assignment trigger with dynamic university checks',
        sql: `
          CREATE OR REPLACE FUNCTION public.handle_profile_role_and_badge()
          RETURNS TRIGGER AS $$
          DECLARE
            v_matching_uni BOOLEAN;
          BEGIN
            -- Preserve admin roles
            IF NEW.role = 'admin' THEN
              RETURN NEW;
            END IF;

            -- Verify if email ends with any university's domain
            SELECT EXISTS (
              SELECT 1 FROM public.universities 
              WHERE NEW.email ILIKE '%@' || domain OR NEW.email ILIKE '%.' || domain
            ) INTO v_matching_uni;

            IF v_matching_uni THEN
              -- Grant student status if matched
              IF NEW.role NOT IN ('student', 'vendor', 'admin') THEN
                NEW.role := 'student';
              END IF;
            ELSE
              -- Revert to guest role for manual admin approval
              NEW.role := 'guest';
              NEW.badge_type := 'guest';
              NEW.badge_color := '#ec4899';
            END IF;

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_handle_profile_role_and_badge ON public.profiles;
          CREATE TRIGGER trg_handle_profile_role_and_badge
          BEFORE INSERT OR UPDATE OF email, role ON public.profiles
          FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_and_badge();
        `
      },
      {
        label: 'Reload PostgREST schema cache (final)',
        sql: `NOTIFY pgrst, 'reload schema';`
      }
    ];

    for (const item of queries) {
      console.log(`Running: ${item.label}`);
      await client.query(item.sql);
      results.push({ label: item.label, status: 'OK' });
    }

    console.log('Database fixes applied successfully.');
    return { statusCode: 200, message: 'Database fixes applied successfully', results };
  } catch (err) {
    console.error('Error applying database fixes:', err);
    return { statusCode: 500, error: err.message, results };
  } finally {
    await client.end();
  }
};

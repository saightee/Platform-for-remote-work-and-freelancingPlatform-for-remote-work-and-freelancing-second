import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { searchTalents } from "../services/api";
import { brandBackendOrigin } from "../brand";
import { Profile } from "@types";

const calcAge = (dob?: string | null): number | null => {
  if (!dob) return null;

  let year: number;
  let month: number;
  let day: number;

  // Поддерживаем и чистый "YYYY-MM-DD", и "YYYY-MM-DDTHH:mm:ss..."
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    year = Number(m[1]);
    month = Number(m[2]) - 1;
    day = Number(m[3]);
  } else {
    // fallback: пусть JS сам парсит дату
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }

  const birth = new Date(year, month, day);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mdiff = today.getMonth() - birth.getMonth();

  if (mdiff < 0 || (mdiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 0 || age > 150) return null;
  return age;
};


// вытаскиваем названия скиллов из разных возможных полей
function extractSkillNames(t: any): string[] {
  const out: string[] = [];

  const pushNames = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (!x) continue;
        if (typeof x === "string") out.push(x);
        else if (x?.name) out.push(x.name);
      }
    } else if (typeof v === "string") {
      out.push(
        ...v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
  };

  pushNames(t?.skills);
  pushNames(t?.skills_all);
  pushNames(t?.all_skills);
  pushNames(t?.skills_full);
  pushNames(t?.profile_skills);
  pushNames(t?.skills_text);

  if (Array.isArray(t?.categories)) {
    for (const c of t.categories) {
      if (c?.name) out.push(c.name);
      if (Array.isArray(c?.subcategories)) {
        for (const sub of c.subcategories) if (sub?.name) out.push(sub.name);
      }
    }
  }

  pushNames(t?.categories_all);
  pushNames(t?.profile_categories);
  pushNames(t?.skill_names);
  pushNames(t?.skill_list);

  return Array.from(new Set(out));
}

// строим строку рейта из expected salary
const buildRate = (t: any): string | null => {
  const min = t.expected_salary;
  const max = t.expected_salary_max;
  const type = t.expected_salary_type; // 'per month' | 'per day'
  const currency = t.currency || "";

  const hasMin = min != null && min !== "" && Number(min) !== 0;
  const hasMax = max != null && max !== "" && Number(max) !== 0;
  if (!hasMin && !hasMax) return null;

  const minNum = hasMin ? Number(min) : null;
  const maxNum = hasMax ? Number(max) : null;

  let amount = "";
  if (hasMin && hasMax) {
    if (minNum === maxNum) amount = String(minNum);
    else amount = `${minNum}–${maxNum}`;
  } else if (hasMin) {
    amount = String(minNum);
  } else if (hasMax) {
    amount = String(maxNum);
  }

  if (currency) amount = `${currency} ${amount}`;

  let suffix = "";
  if (type === "per day") suffix = "/day";
  else if (type === "per month") suffix = "/month";

  return `${amount}${suffix}`;
};

const DEBUG_FEATURED = true; // потом поставишь false


const FeaturedFreelancers = () => {
  const [featured, setFeatured] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        // берём пачку талантов, дальше сами фильтруем/рандомим
        const res: any = await searchTalents({ page: 1, limit: 60 });

        let all: Profile[] = [];
        if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
          all = res.data as Profile[];
        } else if (Array.isArray(res)) {
          all = res as Profile[];
        }

const stats = {
  total: all.length,
  pass: 0,
  fail: {
    avatar: 0,
    username: 0,
    title: 0,
    country: 0,
    dob: 0,
    rate: 0,
    skills: 0,
  },
  samples: {
    avatar: null as any,
    username: null as any,
    title: null as any,
    country: null as any,
    dob: null as any,
    rate: null as any,
    skills: null as any,
  },
};

const eligible = all.filter((t: any) => {
  if (!t) return false;

  // 1) avatar
  const avatar = t.avatar;
  if (!avatar) {
    stats.fail.avatar++;
    stats.samples.avatar ||= t;
    return false;
  }

  // 2) username
  const username = t.username;
  if (!username) {
    stats.fail.username++;
    stats.samples.username ||= t;
    return false;
  }

  // 3) title
  const title =
    t.current_position ||
    t.headline ||
    t.title ||
    null;
  if (!title) {
    stats.fail.title++;
    stats.samples.title ||= t;
    return false;
  }

  // 4) country
  const country = t.country_name || t.country || '';
  if (!country) {
    stats.fail.country++;
    stats.samples.country ||= t;
    return false;
  }

  // 5) date_of_birth
  const dob = t.date_of_birth || null;
  const age = calcAge(dob);
  if (age == null) {
    stats.fail.dob++;
    stats.samples.dob ||= { ...t, _dob: dob };
    return false;
  }

  // 6) rate
  const rate = buildRate(t);
  if (!rate) {
    stats.fail.rate++;
    stats.samples.rate ||= t;
    return false;
  }

  // 7) skills
  const skills = extractSkillNames(t);
  if (!skills.length) {
    stats.fail.skills++;
    stats.samples.skills ||= t;
    return false;
  }

  stats.pass++;
  return true;
});

if (DEBUG_FEATURED) {
  console.group('[FeaturedFreelancers] filter diagnostics');
  console.log('total:', stats.total);
  console.log('pass:', stats.pass);
  console.table(stats.fail);
  console.log('sample fail avatar:', stats.samples.avatar);
  console.log('sample fail username:', stats.samples.username);
  console.log('sample fail title:', stats.samples.title);
  console.log('sample fail country:', stats.samples.country);
  console.log('sample fail dob:', stats.samples.dob);
  console.log('sample fail rate:', stats.samples.rate);
  console.log('sample fail skills:', stats.samples.skills);
  console.groupEnd();
}


        if (!mounted) return;

        if (!eligible.length) {
          setFeatured([]);
          return;
        }

        // рандомно выбираем до 6
        const shuffled = [...eligible].sort(() => Math.random() - 0.5);
        setFeatured(shuffled.slice(0, 6));
      } catch (e) {
        console.error("Failed to load featured talents", e);
        if (mounted) setFeatured([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="freelancers" className="oj-section oj-section--talent">
      <div className="oj-section-inner">
        <header className="oj-section-header oj-section-header--center">
          <h2 className="oj-section-title">Featured Talent</h2>
          <p className="oj-section-subtitle">
            Connect with skilled professionals ready to bring your projects to life
          </p>
        </header>

        <div className="oj-freelancers-grid">
          {loading && featured.length === 0 && (
            // можно простой плейсхолдер, верстка не ломается
            <p style={{ gridColumn: "1 / -1", textAlign: "center" }}>
              Loading featured talent…
            </p>
          )}

          {!loading && featured.length === 0 && (
            <p style={{ gridColumn: "1 / -1", textAlign: "center" }}>
              No featured talent yet.
            </p>
          )}

          {featured.map((talent: any) => {
            const age = calcAge(talent.date_of_birth || null)!;
            const country =
              talent.country_name || talent.country || "Unknown country";
            const locationLabel = `Remote, ${country}`; // заглушка Remote
            const rate = buildRate(talent)!;
            const skills = extractSkillNames(talent);
            const avatarSrc = talent.avatar.startsWith("http")
              ? talent.avatar
              : `${brandBackendOrigin()}${talent.avatar}`;

            const title =
              talent.current_position ||
              talent.headline ||
              talent.title ||
              "Specialist";

            return (
              <article key={talent.id} className="oj-freelancer-card">
                <div className="oj-freelancer-avatar-wrap">
                  <img
                    src={avatarSrc}
                    alt={talent.username}
                    className="oj-freelancer-avatar"
                  />
                </div>

                <h3 className="oj-freelancer-name">{talent.username}</h3>
                <p className="oj-freelancer-title">{title}</p>

                <div className="oj-freelancer-location">
                  <MapPin className="oj-freelancer-location-icon" />
                  <span>{locationLabel}</span>
                </div>

                <div className="oj-freelancer-stats">
                  <div className="oj-freelancer-stat">
                    <div className="oj-freelancer-stat-label">Age</div>
                    <div className="oj-freelancer-stat-value">{age} yrs</div>
                  </div>

                  <div className="oj-freelancer-stat-divider" />

                  <div className="oj-freelancer-stat">
                    <div className="oj-freelancer-stat-label">Rate</div>
                    <div className="oj-freelancer-stat-value oj-freelancer-stat-rate">
                      {rate}
                    </div>
                  </div>
                </div>

                <div className="oj-freelancer-skills">
                  {skills.slice(0, 3).map((skill, i) => (
                    <span key={i} className="oj-chip oj-chip--secondary">
                      {skill}
                    </span>
                  ))}
                  {skills.length > 3 && (
                    <span className="oj-chip oj-chip--secondary">
                      +{skills.length - 3}
                    </span>
                  )}
                </div>

                <Link
                  to={`/public-profile/${talent.slug_id ?? talent.id}`}
                  className="oj-btn oj-btn--primary oj-freelancer-btn"
                >
                  View Profile
                </Link>
              </article>
            );
          })}
        </div>

        <div className="oj-freelancers-footer">
          <Link
            to="/find-talent"
            className="oj-btn oj-btn--hero jobs_talent_btn"
          >
            Browse All Freelancers
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFreelancers;

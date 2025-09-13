import React from "react";
import ReactCountryFlag from "react-country-flag";
import { FaBriefcase, FaUserTie, FaQuoteLeft } from "react-icons/fa";
import "../styles/testimonials-carousel.css";
import heroImgGirl from '../assets/testi_employer.png';

export type Testimonial = {
  role: "employer" | "talent";
  text: string;
  name: string;
  title: string;
  countryCode: string;
  avatarUrl?: string; // опционально, можно не задавать
};

type Props = {
  title?: string;
  items: Testimonial[];
  className?: string;
  heroImageUrl?: string; // картинка для большой фигуры слева
};

const TestimonialsCarousel: React.FC<Props> = ({
  title = "What Our Users Say",
  items,
  className = "",
  heroImageUrl,
}) => {
  if (!items || items.length === 0) return null;

  const hero = items[0];
  const rest = items.slice(1);
  const img = heroImageUrl || hero.avatarUrl || "";

  return (
    <section className={`tc-wrap ${className}`}>
      <h2 className="tc-title">{title}</h2>

      {/* HERO секция */}
      <div className="tc-hero">
        <div
          className={`tc-hero-figure ${img ? "tc-hero-figure--img" : "tc-hero-figure--fallback"}`}
          style={img ? { backgroundImage: `url(${heroImgGirl})` } : undefined}
          aria-hidden="true"
        />

        <article className="tc-hero-quote">
          <div className={`tc-badge ${hero.role === "employer" ? "tc-employer" : "tc-talent"}`}>
            {hero.role === "employer" ? <FaBriefcase /> : <FaUserTie />}{" "}
            {hero.role === "employer" ? "Employer" : "Talent"}
          </div>
          <FaQuoteLeft className="tc-quote-icon" />
          <p className="tc-hero-text">{hero.text}</p>

          <div className="tc-hero-person">
            <div className="tc-name">{hero.name}</div>
            <div className="tc-sub">
              {hero.title}
              <ReactCountryFlag countryCode={hero.countryCode} svg className="tc-flag" />
            </div>
          </div>
        </article>
      </div>



      {/* Остальные отзывы сеткой */}
      <div className="tc-grid">
        {rest.map((t, i) => (
          <article className="tc-card" key={`${t.name}-${i}`}>
            <div className={`tc-badge ${t.role === "employer" ? "tc-employer" : "tc-talent"}`}>
              {t.role === "employer" ? <FaBriefcase /> : <FaUserTie />}{" "}
              {t.role === "employer" ? "Employer" : "Talent"}
            </div>

            <FaQuoteLeft className="tc-quote-icon" />
            <p className="tc-text">{t.text}</p>

            <div className="tc-person">
              <div className="tc-name">{t.name}</div>
              <div className="tc-sub">
                {t.title}
                <ReactCountryFlag countryCode={t.countryCode} svg className="tc-flag" />
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="tc-dots" aria-hidden="true">
  <span></span><span></span><span></span>
</div>
    </section>
  );
};

export default TestimonialsCarousel;

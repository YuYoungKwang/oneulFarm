import React, { useEffect, useMemo, useState } from "react";
import "../styles/banner.css";

const FALLBACK_SLIDES = [
  {
    key: "recipe",
    eyebrow: "Recipe",
    title: "지금 인기 있는 레시피",
    desc: "많이 찾는 메뉴부터 빠르게 살펴보세요.",
    primaryLabel: "레시피 보기",
    primaryHref: "#/recipes",
    secondaryLabel: "상품 보기",
    secondaryHref: "#/products",
    highlights: ["인기 레시피", "대표 재료", "빠른 탐색"],
    imageUrl: buildFallbackArtwork("recipe"),
  },
  {
    key: "seasonal",
    eyebrow: "Seasonal",
    title: "지금 담기 좋은 제철 재료",
    desc: "가격 메리트 좋은 제철 상품만 골라보세요.",
    primaryLabel: "제철 상품 보기",
    primaryHref: "#/products?tag=SEASONAL",
    secondaryLabel: "가격 분석 보기",
    secondaryHref: "#/price-analysis",
    highlights: ["제철", "할인 추천", "레시피 연계"],
    imageUrl: buildFallbackArtwork("seasonal"),
  },
  {
    key: "meal-plan",
    eyebrow: "Meal Plan",
    title: "AI 챗봇으로 맞춤 식단",
    desc: "대화로 조건을 입력하면 식단표와 장보기 목록을 바로 추천해요.",
    primaryLabel: "챗봇 시작",
    primaryHref: "#/meal-plan",
    secondaryLabel: "레시피 둘러보기",
    secondaryHref: "#/recipes",
    highlights: ["대화형 추천", "주간 식단표", "장보기 연결"],
    imageUrl: buildFallbackArtwork("meal-plan"),
  },
];

function buildFallbackArtwork(type) {
  if (type === "seasonal") {
    return buildSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360">
        <rect width="520" height="360" rx="34" fill="#edf7ef"/>
        <rect x="36" y="30" width="448" height="300" rx="28" fill="#fff"/>
        <circle cx="176" cy="172" r="60" fill="#ff8b5c"/>
        <circle cx="260" cy="148" r="56" fill="#ffe067"/>
        <circle cx="340" cy="180" r="64" fill="#7dcf73"/>
      </svg>
    `);
  }

  if (type === "meal-plan") {
    return buildSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360">
        <rect width="520" height="360" rx="34" fill="#eef7f1"/>
        <rect x="36" y="30" width="448" height="300" rx="28" fill="#ffffff"/>
        <rect x="72" y="72" width="150" height="90" rx="22" fill="#f4fbf6"/>
        <rect x="94" y="94" width="72" height="14" rx="7" fill="#c7e4d0"/>
        <rect x="94" y="118" width="104" height="12" rx="6" fill="#dcefe2"/>
        <rect x="94" y="140" width="84" height="12" rx="6" fill="#dcefe2"/>
        <rect x="254" y="72" width="194" height="212" rx="24" fill="#f8fbf8"/>
        <rect x="278" y="96" width="146" height="20" rx="10" fill="#dbeedf"/>
        <rect x="278" y="132" width="68" height="54" rx="16" fill="#89c78d"/>
        <rect x="356" y="132" width="68" height="54" rx="16" fill="#f3c85d"/>
        <rect x="278" y="196" width="68" height="54" rx="16" fill="#ef8b6b"/>
        <rect x="356" y="196" width="68" height="54" rx="16" fill="#9ed5aa"/>
        <path d="M122 202c0-19 15-34 34-34h42c19 0 34 15 34 34v40c0 8-6 14-14 14h-52l-20 18v-18h-10c-8 0-14-6-14-14z" fill="#1f8e4d"/>
        <circle cx="164" cy="212" r="6" fill="#ffffff"/>
        <circle cx="187" cy="212" r="6" fill="#ffffff"/>
        <circle cx="210" cy="212" r="6" fill="#ffffff"/>
      </svg>
    `);
  }

  return buildSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360">
      <rect width="520" height="360" rx="34" fill="#fff1ec"/>
      <rect x="40" y="34" width="440" height="292" rx="28" fill="#fff"/>
      <circle cx="260" cy="180" r="86" fill="#fde8df" stroke="#e07a5d" stroke-width="14"/>
    </svg>
  `);
}

function buildSvgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeSlides(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    return FALLBACK_SLIDES;
  }

  return slides.map((slide, index) => ({
    ...(FALLBACK_SLIDES[index] || FALLBACK_SLIDES[0]),
    ...slide,
    highlights: Array.isArray(slide?.highlights)
      ? slide.highlights.filter(Boolean).slice(0, 3)
      : FALLBACK_SLIDES[index]?.highlights || [],
    imageUrl: slide?.imageUrl || FALLBACK_SLIDES[index]?.imageUrl,
  }));
}

export default function HeroSlider({ slides }) {
  const normalizedSlides = useMemo(() => normalizeSlides(slides), [slides]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((previousIndex) =>
      previousIndex >= normalizedSlides.length ? 0 : previousIndex
    );
  }, [normalizedSlides]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((previousIndex) => (previousIndex + 1) % normalizedSlides.length);
    }, 3600);

    return () => clearInterval(interval);
  }, [normalizedSlides.length]);

  const currentSlide = normalizedSlides[index];

  function handleHeroImageError(event) {
    const fallbackSlide =
      FALLBACK_SLIDES.find((slide) => slide.key === currentSlide.key) ||
      FALLBACK_SLIDES[index] ||
      FALLBACK_SLIDES[0];
    const fallbackImageUrl = fallbackSlide?.imageUrl || "";

    if (!fallbackImageUrl || event.currentTarget.src === fallbackImageUrl) {
      return;
    }

    event.currentTarget.src = fallbackImageUrl;
  }

  return (
    <section className="hero-banner">
      <div className="hero-banner__copy">
        <div className="hero-banner__top">
          <span className="hero-banner__eyebrow">{currentSlide.eyebrow}</span>
        </div>

        <h1 className="hero-banner__title">{currentSlide.title}</h1>
        <p className="hero-banner__desc">{currentSlide.desc}</p>

        {Array.isArray(currentSlide.highlights) && currentSlide.highlights.length ? (
          <div className="hero-banner__highlights">
            {currentSlide.highlights.map((highlight) => (
              <span key={highlight} className="hero-banner__chip">
                {highlight}
              </span>
            ))}
          </div>
        ) : null}

        <div className="hero-actions">
          <a className="btn" href={currentSlide.primaryHref}>
            {currentSlide.primaryLabel}
          </a>
          <a className="btn-soft" href={currentSlide.secondaryHref}>
            {currentSlide.secondaryLabel}
          </a>
        </div>
      </div>

      <div className="hero-banner__art">
        <div className="hero-banner__art-frame">
          <img alt={currentSlide.title} onError={handleHeroImageError} src={currentSlide.imageUrl} />
        </div>
      </div>

      <div className="hero-dots">
        {normalizedSlides.map((slide, slideIndex) => (
          <button
            key={slide.key}
            aria-label={`${slide.title} 슬라이드 보기`}
            className={index === slideIndex ? "active" : ""}
            type="button"
            onClick={() => setIndex(slideIndex)}
          />
        ))}
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import "../styles/banner.css";

const FALLBACK_SLIDES = [
  {
    key: "seasonal",
    eyebrow: "Seasonal Pick",
    title: "제철추천",
    desc: "지금 가장 신선한 제철 농산물을 메인에서 먼저 보고 바로 상품으로 이어집니다.",
    primaryLabel: "제철 상품 보기",
    primaryHref: "#/products?tag=SEASONAL",
    secondaryLabel: "오늘 추천상품",
    secondaryHref: "#main-recommended-products",
    imageUrl: buildFallbackArtwork("seasonal"),
  },
  {
    key: "sale",
    eyebrow: "Special Price",
    title: "특가 할인상품",
    desc: "가격 메리트가 큰 상품만 먼저 확인하고 오늘 장보기 비용을 더 가볍게 정리합니다.",
    primaryLabel: "특가 상품 보기",
    primaryHref: "#/products?tag=UNDER_AVG",
    secondaryLabel: "상품 전체 보기",
    secondaryHref: "#/products",
    imageUrl: buildFallbackArtwork("sale"),
  },
  {
    key: "recipe",
    eyebrow: "Recipe Match",
    title: "인기 추천레시피",
    desc: "지금 많이 보는 농산물과 연결되는 레시피를 메인에서 바로 이어서 볼 수 있습니다.",
    primaryLabel: "레시피 보러가기",
    primaryHref: "#/recipes",
    secondaryLabel: "추천 레시피",
    secondaryHref: "#main-recommended-recipes",
    imageUrl: buildFallbackArtwork("recipe"),
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

  if (type === "sale") {
    return buildSvgDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360">
        <rect width="520" height="360" rx="34" fill="#fff4e7"/>
        <rect x="40" y="34" width="440" height="292" rx="28" fill="#fff"/>
        <path d="M208 112h132l68 68-132 132-132-132z" fill="#ff9d3f"/>
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
    ...FALLBACK_SLIDES[index],
    ...slide,
    imageUrl: slide?.imageUrl || FALLBACK_SLIDES[index]?.imageUrl,
  }));
}

const HeroSlider = ({ slides }) => {
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

  return (
    <section className="hero-banner">
      <div className="hero-banner__copy">
        <span className="hero-banner__eyebrow">{currentSlide.eyebrow}</span>

        <h1 className="hero-banner__title">
          오늘팜에서
          <br />
          <span>{currentSlide.title}</span>입니다
        </h1>

        <p className="hero-banner__desc">{currentSlide.desc}</p>

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
        <img alt={currentSlide.title} src={currentSlide.imageUrl} />
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
};

export default HeroSlider;

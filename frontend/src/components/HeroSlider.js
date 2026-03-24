import React, { useEffect, useState } from "react";
import "../styles/banner.css";

const SLIDES = [
  {
    title: "제철 농산물",
    desc: "오늘 가장 신선한 농산물을 만나보세요",
  },
  {
    title: "특가 할인",
    desc: "평균가보다 저렴한 상품을 추천합니다",
  },
  {
    title: "레시피 추천",
    desc: "구매한 재료로 요리를 만들어보세요",
  },
];

const HeroSlider = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">시세 기반 장보기</span>

        <h1>
          오늘 가장 신선한
          <br />
          <span className="accent">{SLIDES[index].title}</span>을 만나보세요
        </h1>

        <p>{SLIDES[index].desc}</p>

        <div className="hero-actions">
          <input placeholder="농산물명, 제철 상품, 레시피 검색" />
          <a className="btn-soft" href="#/ProductApp">오늘의 특가</a>
          <a className="btn" href="#/ProductApp">상품 보기</a>
        </div>

        <div className="hero-dots">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={index === i ? "active" : ""}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>

      <div className="hero-art">
        <div className="art-card back"></div>
        <div className="art-card front"></div>
      </div>
    </section>
  );
};

export default HeroSlider;

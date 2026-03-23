import React, { useEffect, useState } from "react";
import "../styles/banner.css";

const HeroSlider = () => {
  const [index, setIndex] = useState(0);
  

  // 👉 슬라이드 데이터 (나중에 API로 교체 가능)
  const slides = [
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

  // 👉 자동 슬라이드
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero">
      
      {/* 왼쪽 슬라이드 */}
      <div className="hero-copy">
        <span className="eyebrow">시세 기반 장보기</span>

        <h1>
          오늘 가장 신선한<br />
          <span className="accent">{slides[index].title}</span>을 만나보세요
        </h1>

        <p>{slides[index].desc}</p>

        <div className="hero-actions">
          <input placeholder="농산물명, 제철 상품, 레시피 검색" />
          <a className="btn-soft" href="#/ProductApp">오늘의 특가</a>
          <a className="btn" href="#/ProductApp">상품 보기</a>
        </div>

        {/* 인디케이터 */}
        <div className="hero-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={index === i ? "active" : ""}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* 오른쪽 배너 (이미지/API 연결 가능) */}
      <div className="hero-art">
        <div className="hero-note">메인 히어로 배너</div>

        <div className="art-card back"></div>
        <div className="art-card front"></div>
      </div>
    </section>
  );
};

export default HeroSlider;
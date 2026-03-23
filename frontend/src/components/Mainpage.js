import React, { useEffect } from "react";
import HeroSlider from "./HeroSlider";

import "../styles/mainPage.css";

const MainPage = () => {

  useEffect(() => {
    const role = localStorage.getItem("farmsenseRole") || "guest";

    document.querySelectorAll("[data-admin-shortcut]").forEach(el => {
      if (role === "admin") {
        el.classList.remove("admin-nav-hidden");
      } else {
        el.classList.add("admin-nav-hidden");
      }
    });

    document.querySelectorAll("[data-login-role]").forEach(el => {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        const loginRole = this.getAttribute("data-login-role");
        localStorage.setItem("farmsenseRole", loginRole);
        localStorage.setItem("farmsenseLoggedIn", "true");
        window.location.href = this.getAttribute("href");
      });
    });

    document.querySelectorAll("[data-logout]").forEach(el => {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        localStorage.removeItem("farmsenseRole");
        localStorage.removeItem("farmsenseLoggedIn");
        window.location.href = "/";
      });
    });
  }, []);

  return (
    <div className="page-shell">

      {/* 메인 */}
      <main className="container">
        <HeroSlider />



        {/* 카테고리 */}
        <div className="chip-row">
          <div className="chip">🌿 제철</div>
          <div className="chip">🍎 과일</div>
          <div className="chip">🥬 채소</div>
          <div className="chip">🌾 곡물</div>
          <div className="chip">🍄 버섯</div>
          <div className="chip">💸 특가</div>
        </div>

        {/* 상품 */}
        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-title">추천 농산물</div>
              <div className="section-sub">
                평균가 이하 상품 추천
              </div>
            </div>
            <a href="/ProductApp">전체 보기 →</a>
          </div>

          <div className="product-grid">
            {[
              { name: "햇감자 1kg", price: "3,200원", emoji: "🥔" },
              { name: "양파 1kg", price: "2,800원", emoji: "🧅" },
              { name: "토마토", price: "4,500원", emoji: "🍅" },
              { name: "오이", price: "2,400원", emoji: "🥒" },
            ].map((item, i) => (
              <div className="product-card" key={i}>
                <div className="product-media">{item.emoji}</div>
                <div className="product-name">{item.name}</div>
                <div className="price">{item.price}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 배너 */}
<div className="banner-row">
  <article className="info-banner yellow">
    <div>
      <div className="banner-title">이번 달 절약 금액</div>
      <div className="banner-strong">23,450원 절약!</div>
      <div className="section-sub">구매 데이터 기준으로 자동 집계</div>
    </div>
    <div className="banner-illustration">🐤</div>
  </article>

  <article className="info-banner green">
    <div>
      <div className="banner-title">오늘의 추천 레시피</div>
      <div className="banner-strong">시금치 된장국 만들기</div>
      <div className="section-sub">최근 구매 재료와 연결</div>
    </div>
    <div className="banner-illustration">🍲</div>
  </article>
</div>
 {/* 시세분석 + 인사이트 */}
<section className="section grid-2">
  <article className="card">
    <div className="card-title">시세 분석 미리보기</div>
    <div className="card-sub">메인에서도 주요 품목의 추세 확인</div>

    <div className="chart-shell">
      <svg viewBox="0 0 640 280" width="100%" height="280">
        <polyline
          fill="none"
          stroke="#159a55"
          strokeWidth="4"
          points="70,178 138,162 206,150 274,156 342,126 410,120 478,108 546,92"
        />
      </svg>
    </div>
  </article>

  <div style={{ display: "grid", gap: "18px" }}>
    <article className="card">
      <div className="card-title">오늘의 시세 인사이트</div>
      <div className="insight-list">
        <div className="insight-item">
          <strong>토마토</strong>
          <span style={{ color: "var(--green)" }}>-6.2%</span>
        </div>
        <div className="insight-item">
          <strong>양파</strong>
          <span style={{ color: "var(--green)" }}>평균가 이하</span>
        </div>
      </div>
    </article>
  </div>
</section>

{/* 절약 대시보드 + 레시피 */}
<section className="section grid-2">
  <article className="card">
    <div className="card-title">절약 대시보드</div>
    <div className="stat-value">₩ 28,400</div>
  </article>

  <article className="card">
    <div className="card-title">레시피 추천</div>

    <div className="mini-recipes">
      <article className="mini-recipe">
        <h4>감자 수프</h4>
      </article>
      <article className="mini-recipe">
        <h4>양파 덮밥</h4>
      </article>
    </div>
  </article>
</section>

      </main>

      {/* 푸터 */}
     

    </div>
  );
};

export default MainPage;
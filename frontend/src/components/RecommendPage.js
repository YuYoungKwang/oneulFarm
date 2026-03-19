import React from "react";
import "../styles/recommend.css";

const RecommendPage = () => {
  return (
    <div className="page-shell">
      <main className="container">

        {/* 페이지 헤더 */}
        <section className="page-head ">
         <h1>추천</h1>
            <div className="page-row">
            <p>
              시세 데이터, 인기 농산물, 레시피를 바탕으로
              지금 가장 합리적인 선택을 모아봤어요.
            </p>
          
          <div className="page-actions">
            <span className="btn-chip active">구매 타이밍</span>
            <span className="btn-chip">인기 농산물</span>
            <span className="btn-chip">밀키트</span>
            </div>
          </div>
        </section>

        {/* 요약 카드 */}
        <section className="quick-grid stats-grid">
          <div className="quick-card soft-green">
            <div className="quick-label">구매 추천 품목</div>
            <div className="quick-value">양파 1kg</div>
            <div className="section-sub">평균가 대비 18% 저렴</div>
          </div>

          <div className="quick-card soft-yellow">
            <div className="quick-label">인기 농산물</div>
            <div className="quick-value">봄동</div>
            <div className="section-sub">검색 관심도 상승</div>
          </div>

          <div className="quick-card">
            <div className="quick-label">추천 레시피</div>
            <div className="quick-value">감자 수프</div>
          </div>

          <div className="quick-card">
            <div className="quick-label">밀키트 추천</div>
            <div className="quick-value">감자 수프 세트</div>
          </div>
        </section>

        {/* 상품 추천 */}
        <section className="card">
          <div className="section-head">
            <div>
              <div className="section-title">지금 구매 추천</div>
              <div className="section-sub">
                시세 기반 추천
              </div>
            </div>
          </div>

          <div className="product-grid">
            {[
              { name: "양파 1kg", price: "2,800원", emoji: "🧅" },
              { name: "햇감자 1kg", price: "3,200원", emoji: "🥔" },
              { name: "토마토 1kg", price: "4,500원", emoji: "🍅" },
              { name: "오이 2입", price: "2,400원", emoji: "🥒" },
            ].map((item, i) => (
               <article className="product-card" key={i}>
        <div className="product-thumb">{item.emoji}</div>
        <div className="product-name">{item.name}</div>

        {/* 가격 행 */}
        <div className="price-row">
          <strong>{item.price}</strong>
          <span className="small">{item.avg}</span>
        </div>

        {/* 메타 행 */}
        <div className="meta-row">
          <span className="badge green">{item.badge}</span>
          <span className="badge yellow">{item.discount}</span>
        </div>

        {/* 버튼 */}
        <a className="btn soft" href="product-detail.html">상품 보기</a>
      </article>
    ))}

          </div>
        </section>

        {/* 3단 영역 */}
        <section className="grid-3">

{/* 인기 농산물 */}
<div className="card">
  <div className="section-title">인기 농산물</div>
  <div className="list">
    {[
      { name: "봄동", tag: "검색상승" },
      { name: "딸기", tag: "제철" },
      { name: "감자", tag: "장바구니" },
    ].map((item, i) => (
      <div className="insight-row" key={i}>
        <div className="insight-item">{item.name}</div>
        <span className="btn-mini">{item.tag}</span>
      </div>
    ))}
  </div>
</div>



          {/* 추천 레시피 */}
<div className="card">
  <div className="section-title">추천 레시피</div>

 <div className="mini-recipes">
  {[
    { name: "감자 수프" },
    { name: "봄동 겉절이" },
    { name: "양파 덮밥" },
  ].map((recipe, i) => (
    <div className="mini-recipe-row" key={i}>
      <div className="mini-recipe-name">{recipe.name}</div>
      <button className="btn-mini">레시피 보기</button>
    </div>
  ))}
</div>
</div>


          {/* 추천 근거 */}
          <div className="card">
            <div className="section-title">추천 근거</div>
            <div className="list">
              <div className="insight-item">평균가 대비 저렴</div>
              <div className="insight-item">검색량 상승</div>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
};

export default RecommendPage;
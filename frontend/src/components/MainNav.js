import { useEffect, useState } from "react";
import { isAdminUser } from "../auth";
import { openAdminPage } from "../admin/adminSession";
import logo from "../assets/logo.png";
import "../styles/mainNav.css";
import { CartIcon, SearchIcon } from "./ProductIcons";

const NAV_ITEMS = [
  {
    id: "meal-plan",
    label: "맞춤 식단",
    hash: "#/meal-plan",
    section: "meal-plan",
    supLabel: "AI",
  },
  { id: "recipes", label: "레시피", hash: "#/recipes", section: "recipes" },
  { id: "market", label: "가격분석", hash: "#/price-analysis", section: "market" },
  { id: "products", label: "상품", hash: "#/products", section: "products" },
];

const SEARCH_TABS = [
  { key: "products", label: "상품" },
  { key: "recipes", label: "레시피" },
];

const PRODUCT_KEYWORDS = ["사과", "양파", "감자", "버섯", "고기"];
const RECIPE_KEYWORDS = [
  "버섯국",
  "감자조림",
  "양파볶음",
  "고기요리",
  "사과샐러드",
];

function navigateTo(hash) {
  window.location.hash = hash;
}

function buildSearchHash(searchTab, searchQuery) {
  const normalizedQuery = String(searchQuery || "").trim();
  const searchParams = new URLSearchParams();

  if (normalizedQuery) {
    if (searchTab === "recipes") {
      searchParams.set("keyword", normalizedQuery);
    } else {
      searchParams.set("search", normalizedQuery);
      searchParams.set("sort", "RECOMMENDED");
    }
  }

  const queryString = searchParams.toString();
  const basePath = searchTab === "recipes" ? "#/recipes" : "#/products";
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export default function MainNav({
  activeSection,
  authUser,
  cartCount = 0,
  onOpenCart,
  onOpenLogin,
  onOpenSignup,
  onLogout,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("products");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    function closeSearch() {
      setIsSearchOpen(false);
    }

    window.addEventListener("hashchange", closeSearch);
    return () => {
      window.removeEventListener("hashchange", closeSearch);
    };
  }, []);

  const keywordList = searchTab === "recipes" ? RECIPE_KEYWORDS : PRODUCT_KEYWORDS;

  function handleSubmit(event) {
    event.preventDefault();
    navigateTo(buildSearchHash(searchTab, searchQuery));
    setIsSearchOpen(false);
  }

  function handleKeywordClick(keyword) {
    setSearchQuery(keyword);
    navigateTo(buildSearchHash(searchTab, keyword));
    setIsSearchOpen(false);
  }

  return (
    <header className={`main-nav-shell ${isSearchOpen ? "is-search-open" : ""}`}>
      <div className="main-nav">
        <button type="button" className="main-nav__logo" onClick={() => navigateTo("#/")}>
          <span className="main-nav__logo-mark" aria-hidden="true">
            <img src={logo} alt="" />
          </span>
          <span className="main-nav__logo-text">oneulFarm</span>
        </button>

        <nav className="main-nav__links" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.supLabel ? `${item.label} ${item.supLabel}` : item.label}
              className={`main-nav__link ${
                item.section && item.section === activeSection ? "is-active" : ""
              }`}
              onClick={() => navigateTo(item.hash)}
            >
              <span className="main-nav__link-label">
                {item.label}
                {item.supLabel ? (
                  <span className="main-nav__link-sup">{item.supLabel}</span>
                ) : null}
              </span>
            </button>
          ))}
        </nav>

        <div className="main-nav__actions">
          <button
            className={`main-nav__search-trigger ${isSearchOpen ? "is-active" : ""}`}
            type="button"
            aria-label="검색 열기"
            aria-expanded={isSearchOpen}
            onClick={() => setIsSearchOpen((previousState) => !previousState)}
          >
            <SearchIcon />
            <span className="main-nav__search-label">상품 · 레시피 검색</span>
          </button>

          <button
            className="main-nav__icon main-nav__icon--cart"
            type="button"
            aria-label="장바구니"
            onClick={onOpenCart || (() => navigateTo("#/cart"))}
          >
            <CartIcon />
            {cartCount > 0 ? (
              <span className="main-nav__cart-badge">{cartCount}</span>
            ) : null}
          </button>

          {isAdminUser(authUser) ? (
            <button
              type="button"
              className="main-nav__admin-switch"
              onClick={() => openAdminPage("#/admin")}
            >
              관리자
            </button>
          ) : null}

          {authUser ? (
            <>
              <button
                className="main-nav__btn-outline"
                type="button"
                onClick={() => navigateTo("#/mypage")}
              >
                내 계정
              </button>
              <button className="main-nav__btn" type="button" onClick={onLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button className="main-nav__btn-outline" type="button" onClick={onOpenLogin}>
                로그인
              </button>
              <button className="main-nav__btn" type="button" onClick={onOpenSignup}>
                가입하기
              </button>
            </>
          )}
        </div>
      </div>

      {isSearchOpen ? (
        <div className="main-nav-search" role="search">
          <div className="main-nav-search__tabs" role="tablist" aria-label="검색 구분">
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={`main-nav-search__tab ${
                  searchTab === tab.key ? "is-active" : ""
                }`}
                aria-selected={searchTab === tab.key}
                onClick={() => setSearchTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form className="main-nav-search__form" onSubmit={handleSubmit}>
            <label className="main-nav-search__field">
              <span className="main-nav-search__field-label">
                {searchTab === "recipes" ? "레시피 검색" : "상품 검색"}
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  searchTab === "recipes"
                    ? "레시피 이름이나 재료를 입력하세요"
                    : "상품명, 원산지, 설명으로 검색해보세요"
                }
              />
            </label>
            <button className="main-nav-search__submit" type="submit">
              검색
            </button>
          </form>

          <div className="main-nav-search__keywords">
            <strong>추천 검색어</strong>
            <div className="main-nav-search__keyword-row">
              {keywordList.map((keyword) => (
                <button
                  key={keyword}
                  className="main-nav-search__keyword"
                  type="button"
                  onClick={() => handleKeywordClick(keyword)}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

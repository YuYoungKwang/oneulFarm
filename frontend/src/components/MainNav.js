import { useEffect, useState } from "react";
import { isAdminUser } from "../auth";
import "../styles/mainNav.css";
import { openAdminPage } from "../admin/adminSession";
import { CartIcon, SearchIcon } from "./ProductIcons";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  { id: "market", label: "\uac00\uaca9\ubd84\uc11d", hash: "#/price-analysis", section: "market" },
  { id: "products", label: "\uc0c1\ud488", hash: "#/products", section: "products" },
  { id: "recipes", label: "\ub808\uc2dc\ud53c", hash: "#/recipes", section: "recipes" },
  {
    id: "meal-plan",
    label: "\ub9de\ucda4 \uc2dd\ub2e8",
    hash: "#/meal-plan",
    section: "meal-plan",
    supLabel: "ai",
  },
  { id: "mypage", label: "\ub9c8\uc774\ud398\uc774\uc9c0", hash: "#/mypage", section: "mypage" },
];

const SEARCH_TABS = [
  { key: "products", label: "\uc0c1\ud488" },
  { key: "recipes", label: "\ub808\uc2dc\ud53c" },
];

const PRODUCT_KEYWORDS = [
  "\uc0ac\uacfc",
  "\uc591\ud30c",
  "\uac10\uc790",
  "\ubc84\uc12f",
  "\uace0\uae30",
];
const RECIPE_KEYWORDS = [
  "\ubc84\uc12f\uc804\uace8",
  "\uac10\uc790\uc870\ub9bc",
  "\uc591\ud30c\ubcf6\uc74c",
  "\uace0\uae30\uc694\ub9ac",
  "\uc0ac\uacfc\uc0d0\ub7ec\ub4dc",
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
    const closeSearch = () => setIsSearchOpen(false);

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

        <nav className="main-nav__links" aria-label="\uc8fc\uc694 \uba54\ub274">
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
          {isAdminUser(authUser) ? (
            <button
              type="button"
              className="main-nav__link main-nav__link--admin"
              onClick={() => openAdminPage("#/admin")}
            >
              {"\uad00\ub9ac\uc790\uacc4\uc815 \uc804\ud658"}
            </button>
          ) : null}
        </nav>

        <div className="main-nav__actions">
          <button
            className={`main-nav__icon ${isSearchOpen ? "is-active" : ""}`}
            type="button"
            aria-label="\uac80\uc0c9 \uc5f4\uae30"
            aria-expanded={isSearchOpen}
            onClick={() => setIsSearchOpen((previousState) => !previousState)}
          >
            <SearchIcon />
          </button>
          <button
            className="main-nav__icon main-nav__icon--cart"
            type="button"
            aria-label="\uc7a5\ubc14\uad6c\ub2c8"
            onClick={onOpenCart || (() => navigateTo("#/cart"))}
          >
            <CartIcon />
            {cartCount > 0 ? (
              <span className="main-nav__cart-badge">{cartCount}</span>
            ) : null}
          </button>
          {authUser ? (
            <>
              <button
                className="main-nav__btn-outline"
                type="button"
                onClick={() => navigateTo("#/mypage")}
              >
                {authUser.nickname || authUser.userId}
              </button>
              <button className="main-nav__btn" type="button" onClick={onLogout}>
                {"\ub85c\uadf8\uc544\uc6c3"}
              </button>
            </>
          ) : (
            <>
              <button className="main-nav__btn-outline" type="button" onClick={onOpenLogin}>
                {"\ub85c\uadf8\uc778"}
              </button>
              <button className="main-nav__btn" type="button" onClick={onOpenSignup}>
                {"\uac00\uc785\ud558\uae30"}
              </button>
            </>
          )}
        </div>
      </div>

      {isSearchOpen ? (
        <div className="main-nav-search" role="search">
          <div
            className="main-nav-search__tabs"
            role="tablist"
            aria-label="\uac80\uc0c9 \uad6c\ubd84"
          >
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
                {searchTab === "recipes"
                  ? "\ub808\uc2dc\ud53c \uac80\uc0c9"
                  : "\uc0c1\ud488 \uac80\uc0c9"}
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  searchTab === "recipes"
                    ? "\ub808\uc2dc\ud53c \uc774\ub984\uc774\ub098 \uc7ac\ub8cc\ub97c \uc785\ub825\ud558\uc138\uc694"
                    : "\uc0c1\ud488\uba85, \uc6d0\uc0b0\uc9c0, \uc124\uba85\uc73c\ub85c \uac80\uc0c9\ud574\ubcf4\uc138\uc694"
                }
              />
            </label>
            <button className="main-nav-search__submit" type="submit">
              {"\uac80\uc0c9"}
            </button>
          </form>

          <div className="main-nav-search__keywords">
            <strong>{"\ucd94\ucc9c \uac80\uc0c9\uc5b4"}</strong>
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

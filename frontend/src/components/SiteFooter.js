// src/components/SiteFooter.js
import '../styles/footer.css';
function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        <button type="button">개인정보처리방침</button>
        <button type="button">이용약관</button>
        <button type="button">고객센터</button>
      </div>
      <div>© 2026 oneulFarm. Product UI preview.</div>
    </footer>
  );
}

export default SiteFooter;
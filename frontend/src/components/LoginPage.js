import React, { useState } from 'react';
import { DEFAULT_ROUTE } from './productUiUtils';
import './user.css';

export default function LoginPage({ onBack }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    function handleSubmit(e) {
        e.preventDefault();
        alert(`로그인 시도: ${username}`);
    }

    function goToSignup() {
        window.location.hash = '#/signup';
    }

    function handleKakaoLogin() {
        const REST_API_KEY = '여기에_카카오_REST_API_KEY';
        const REDIRECT_URI = 'http://localhost:3000/kakao/callback';

        const kakaoURL = `https://kauth.kakao.com/oauth/authorize?client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`;

        window.location.href = kakaoURL;
    }

    function handleNaverLogin() {
        const CLIENT_ID = '네이버_CLIENT_ID';
        const REDIRECT_URI = 'http://localhost:3000/naver/callback';
        const STATE = Math.random().toString(36).substring(2); // 보안용

        const naverURL = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${STATE}`;

        window.location.href = naverURL;
    }

    function handleGoogleLogin() {
        const CLIENT_ID = '구글_CLIENT_ID';
        const REDIRECT_URI = 'http://localhost:3000/google/callback';

        const googleURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20email%20profile`;

        window.location.href = googleURL;
    }

    return (
        <div className="page-shell">

            <header className="top-nav">
                <a className="logo" href={DEFAULT_ROUTE}>
                    <span className="logo-mark"></span>
                    <span>LOGO</span>
                </a>

                <nav className="nav-links">
                    <a className="nav-link" href="#">시세분석</a>
                    <a className="nav-link" href="#">상품</a>
                    <a className="nav-link" href="#">레시피</a>
                    <a className="nav-link" href="#">추천</a>
                    <a className="nav-link" href="#">마이페이지</a>
                </nav>

                <div className="nav-actions">
                    <button
                        className="btn-outline"
                        onClick={() => window.location.hash = '#/login'}
                    >
                        로그인
                    </button>

                    <button
                        className="btn"
                        onClick={() => window.location.hash = '#/signup'}
                    >
                        가입
                    </button>
                </div>
            </header>

            <main className="container">

                <section className="auth-wrap">

                    <article className="auth-brand">
                        <span className="eyebrow">Farmly 로그인</span>
                        <h1>
                            시세 기반 장보기를<br />
                            <span className="accent">계속 이어가세요</span>
                        </h1>
                        <p className="muted">
                            로그인하면 절약 금액, 주문 내역, 레시피 추천을 모두 저장할 수 있어요.
                        </p>

                        <ul>
                            <li>누적 절약 금액 자동 집계</li>
                            <li>주문 내역과 배송 상태 확인</li>
                            <li>최근 구매 재료 기반 레시피 추천</li>
                        </ul>

                        <div className="empty-illustration" style={{ marginTop: '24px' }}>
                            브랜드 일러스트 영역
                        </div>
                    </article>

                    <article className="auth-form">
                        <div className="card-title" style={{ fontSize: '28px', marginBottom: '24px' }}>로그인</div>

                        <form onSubmit={handleSubmit}>
                            <div className="field">
                                <label>아이디</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="아이디 입력"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>비밀번호</label>
                                <input
                                    className="input"
                                    type="password"
                                    placeholder="비밀번호를 입력하세요"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="help-row">
                                <label>
                                    <input type="checkbox" /> 로그인 유지
                                </label>
                                <span style={{ cursor: 'pointer' }}>비밀번호 찾기</span>
                            </div>

                            <button className="btn" type="submit" style={{ width: '100%', marginTop: '20px' }}>
                                로그인
                            </button>
                        </form>

                        <div className="auth-divider">간편로그인</div>

                        <div className="social-grid">
                            <div className="social-btn kakao" onClick={handleKakaoLogin}>카카오</div>
                            <div className="social-btn naver" onClick={handleNaverLogin}>네이버</div>
                            <div className="social-btn google" onClick={handleGoogleLogin}>구글</div>
                        </div>

                        <p className="card-sub" style={{ marginTop: '18px', textAlign: 'center' }}>
                            계정이 없나요?{' '}
                            <span
                                onClick={goToSignup}
                                style={{ color: 'var(--green)', fontWeight: 800, cursor: 'pointer' }}
                            >
                                회원가입
                            </span>
                        </p>
                    </article>

                </section>

            </main>

        </div>
    );
}
import React, { useState } from 'react';
import { DEFAULT_ROUTE } from './productUiUtils';
import './user.css';

export default function SignupPage({ onBack }) {
    const [form, setForm] = useState({
        username: '',
        password: '',
        email: '',
        name: '',
        birth: '',
        phone: '',
        carrier: '',
        gender: '',
        nationality: '',
        agreeAll: false,
        agreeTerms: false,
        agreePrivacy: false,
        agreeFarm: false,
    });

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        alert('회원가입 시도: ' + JSON.stringify(form));
    }

    function goToLogin() {
        window.location.hash = '#/login';
    }

    return (
        <div className="page-shell">

            {/* 상단 네비 */}
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

                    {/* 왼쪽 */}
                    <article className="auth-brand">
                        <span className="eyebrow">Farmly 회원가입</span>
                        <h1>
                            나만의 절약 리포트를<br />
                            <span className="accent">지금 시작해보세요</span>
                        </h1>

                        <p className="muted">
                            가입 후 주문 데이터를 바탕으로 월별 절약 금액과 추천 상품을 확인할 수 있어요.
                        </p>

                        <div className="quick-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '28px' }}>
                            <div className="quick-card soft-green">
                                <div className="quick-label">절약 대시보드</div>
                                <div className="quick-value">자동 집계</div>
                            </div>

                            <div className="quick-card soft-yellow">
                                <div className="quick-label">레시피 추천</div>
                                <div className="quick-value">재료 기반</div>
                            </div>
                        </div>
                    </article>

                    {/* 오른쪽 */}
                    <article className="auth-form">

                        <div className="card-title" style={{ fontSize: '28px' }}>회원가입</div>

                        <form onSubmit={handleSubmit}>

                            <div className="field">
                                <label>이메일</label>
                                <input
                                    className="input"
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="farmly@example.com"
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>아이디</label>
                                <input
                                    className="input"
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    placeholder="아이디"
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>전화번호</label>
                                <input
                                    className="input"
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="010-0000-0000"
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>비밀번호</label>
                                <input
                                    className="input"
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="비밀번호"
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>비밀번호 확인</label>
                                <input
                                    className="input"
                                    type="password"
                                    placeholder="비밀번호 확인"
                                    required
                                />
                            </div>

                            <div className="help-row">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="agreeTerms"
                                        checked={form.agreeTerms}
                                        onChange={handleChange}
                                    />
                                    개인정보 처리방침 동의
                                </label>
                            </div>

                            <button className="btn" type="submit" style={{ width: '100%', marginTop: '18px' }}>
                                가입하기
                            </button>

                        </form>

                        <p className="card-sub" style={{ marginTop: '18px', textAlign: 'center' }}>
                            이미 계정이 있나요?{' '}
                            <span
                                onClick={goToLogin}
                                style={{ color: 'var(--green)', fontWeight: 800, cursor: 'pointer' }}
                            >
                                로그인
                            </span>
                        </p>

                    </article>

                </section>

            </main>

        </div>
    );
}
import React, { useState } from 'react';
import { DEFAULT_ROUTE } from './productUiUtils';
import './login.css';

export default function LoginPage({ onBack }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    function handleSubmit(e) {
        e.preventDefault();
        // 로그인 처리 로직 (예시)
        alert(`로그인 시도: ${username}`);
    }

    function goToSignup() {
        window.location.hash = '#/signup';
    }

    return (
        <section className="login-page-container">
            <a className="login-logo" href={DEFAULT_ROUTE}>
                oneulFarm
            </a>
            <h1 className="login-title">로그인</h1>
            <form onSubmit={handleSubmit} className="login-form">
                <input
                    type="text"
                    placeholder="아이디"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                <div className="login-keep">
                    <input type="checkbox" id="keepLogin" />
                    <label htmlFor="keepLogin">로그인 상태 유지</label>
                </div>
                <button className="btn login-btn" type="submit">
                    로그인
                </button>
                <button className="btn-outline login-back" type="button" onClick={onBack}>
                    뒤로가기
                </button>
            </form>
            <div className="login-links">
                <span>비밀번호 찾기</span>
                <span className="divider">|</span>
                <span>아이디 찾기</span>
                <span className="divider">|</span>
                <span onClick={goToSignup} style={{ cursor: 'pointer' }}>회원가입</span>
            </div>
        </section>
    );
}

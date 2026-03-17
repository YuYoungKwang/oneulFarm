import React, { useState } from 'react';
import { DEFAULT_ROUTE } from './productUiUtils';
import './signup.css';

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

    function handleAgreeAll(e) {
        const checked = e.target.checked;
        setForm(prev => ({
            ...prev,
            agreeAll: checked,
            agreeTerms: checked,
            agreePrivacy: checked,
            agreeFarm: checked,
        }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        alert('회원가입 시도: ' + JSON.stringify(form));
    }

    return (
        <section className="signup-page-container">
            <a className="signup-logo" href={DEFAULT_ROUTE}>
                oneulFarm
            </a>
            <h1 className="signup-title">회원가입</h1>
            <form onSubmit={handleSubmit} className="signup-form">
                <input name="username" type="text" placeholder="아이디" value={form.username} onChange={handleChange} required />
                <input name="password" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
                <input name="email" type="email" placeholder="이메일" value={form.email} onChange={handleChange} required />
                <input name="name" type="text" placeholder="이름" value={form.name} onChange={handleChange} required />
                <input name="birth" type="text" placeholder="생년월일 8자리 (YYYYMMDD)" value={form.birth} onChange={handleChange} maxLength={8} required />
                <input name="phone" type="text" placeholder="전화번호" value={form.phone} onChange={handleChange} required />
                <div className="select-wrapper">
                    <select name="carrier" value={form.carrier} onChange={handleChange} required>
                        <option value="">통신사 선택</option>
                        <option value="SKT">SKT</option>
                        <option value="KT">KT</option>
                        <option value="LGU+">LGU+</option>
                        <option value="알뜰폰">알뜰폰</option>
                    </select>
                    <span className="select-arrow">▼</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <label><input type="radio" name="gender" value="남자" checked={form.gender === '남자'} onChange={handleChange} /> 남자</label>
                    <label><input type="radio" name="gender" value="여자" checked={form.gender === '여자'} onChange={handleChange} /> 여자</label>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <label><input type="radio" name="nationality" value="내국인" checked={form.nationality === '내국인'} onChange={handleChange} /> 내국인</label>
                    <label><input type="radio" name="nationality" value="외국인" checked={form.nationality === '외국인'} onChange={handleChange} /> 외국인</label>
                </div>
                <div style={{ margin: '32px 0 16px 0', border: '1px solid #eee', borderRadius: 8, padding: 16, background: '#fafafa' }}>
                    <label style={{ fontWeight: 700, fontSize: 15 }}>
                        <input type="checkbox" name="agreeAll" checked={form.agreeAll} onChange={handleAgreeAll} style={{ marginRight: 8 }} />
                        전체 약관 동의
                    </label>
                    <div style={{ marginTop: 12, marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label><input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange} /> 이용약관 동의 (필수)</label>
                        <label><input type="checkbox" name="agreePrivacy" checked={form.agreePrivacy} onChange={handleChange} /> 개인정보처리방침 동의 (필수)</label>
                        <label><input type="checkbox" name="agreeFarm" checked={form.agreeFarm} onChange={handleChange} /> 농산물 직거래 서비스 약관 동의 (필수)</label>
                    </div>
                </div>
                <button className="btn signup-btn" type="submit">
                    회원가입
                </button>
                <button className="btn-outline signup-back" type="button" onClick={onBack}>
                    뒤로가기
                </button>
            </form>
        </section>
    );
}

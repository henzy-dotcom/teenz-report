import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: '/',              label: '대시보드',    end: true  },
    { to: '/periods',       label: '리포트 회차', end: false },
    { to: '/students',      label: '학생 관리',   end: false },
    { to: '/attendance',      label: '출결 관리',   end: false },
    { to: '/monthly-reports', label: '월간 리포트', end: true  },
    { to: '/admin/consult', label: '신규생 상담', end: false },
    { to: '/teacher-comments', label: '선생님 한마디', end: false },
    { to: '/kakao-templates', label: '카톡 템플릿', end: false },
    { to: '/monthly-reports/stats', label: '운영 그래프', end: false },
  ];

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 0', flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, background: 'var(--color-deep-navy)', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: 'var(--color-sky-blue)', flexShrink: 0,
          }}>T</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-deep-navy)', lineHeight: 1.2 }}>HENZY</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 400, lineHeight: 1 }}>어드민</div>
          </div>
        </div>

        {/* 데스크탑 메뉴 */}
        <div className="nav-desktop" style={{ display: 'flex', flex: 1, gap: 0, marginLeft: 24 }}>
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              padding: '15px 12px', fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--color-deep-navy)' : '#6B7280',
              borderBottom: isActive ? '2px solid var(--color-sky-blue)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'color 0.15s', whiteSpace: 'nowrap',
            })}>
              {label}
            </NavLink>
          ))}
        </div>

        {/* 원장 배지 — 데스크탑 */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#F5F0E8', borderRadius: 20, flexShrink: 0, marginLeft: 12 }}>
          <div style={{ width: 22, height: 22, background: 'var(--color-deep-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>원</div>
          <span style={{ fontSize: 12, color: 'var(--color-deep-navy)', fontWeight: 600 }}>진해남문점</span>
        </div>

        {/* 햄버거 버튼 — 모바일 */}
        <button
          className="nav-mobile"
          onClick={() => setMenuOpen(o => !o)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}
          aria-label="메뉴"
        >
          <span style={{ display: 'block', width: 22, height: 2, background: menuOpen ? 'transparent' : '#2B3660', transition: '0.2s' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#2B3660', transform: menuOpen ? 'translateY(-7px) rotate(45deg)' : 'none', transition: '0.2s' }} />
          <span style={{ display: 'block', width: 22, height: 2, background: '#2B3660', transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none', transition: '0.2s' }} />
        </button>
      </nav>

      {/* 모바일 드로어 */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,0.3)' }}
          onClick={close}
        />
      )}
      <div className="nav-mobile" style={{
        position: 'fixed', top: 57, left: 0, right: 0, zIndex: 195,
        background: '#fff', borderBottom: '1px solid #E5E7EB',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        transform: menuOpen ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.25s ease',
        padding: '8px 0 16px',
      }}>
        {links.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={close} style={({ isActive }) => ({
            display: 'block', padding: '13px 22px', fontSize: 15,
            fontWeight: isActive ? 700 : 400,
            color: isActive ? 'var(--color-deep-navy)' : '#374151',
            background: isActive ? '#F0F4FF' : 'none',
            borderLeft: isActive ? '3px solid var(--color-sky-blue)' : '3px solid transparent',
          })}>
            {label}
          </NavLink>
        ))}
        <div style={{ margin: '12px 22px 0', padding: '10px 14px', background: '#F5F0E8', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
          <div style={{ width: 22, height: 22, background: 'var(--color-deep-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>원</div>
          <span style={{ fontSize: 13, color: 'var(--color-deep-navy)', fontWeight: 600 }}>진해남문점</span>
        </div>
      </div>
    </>
  );
}

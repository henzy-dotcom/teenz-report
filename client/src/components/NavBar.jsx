import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: '/',              label: '대시보드',    end: true  },
    { to: '/periods',       label: '리포트 회차', end: false },
    { to: '/students',      label: '학생 관리',   end: false },
    { to: '/admin/consult', label: '신규생 상담', end: false },
    { to: '/kakao-templates', label: '카톡 템플릿', end: false },
    { to: '/attendance',      label: '출결 관리',   end: false },
    { to: '/monthly-reports', label: '월간 리포트', end: false },
  ];

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #E5E7EB',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* 로고 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '13px 0',
        marginRight: 32,
        flexShrink: 0,
        textDecoration: 'none',
      }}>
        <div style={{
          width: 30, height: 30,
          background: 'var(--color-deep-navy)',
          borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: 'var(--color-sky-blue)',
          letterSpacing: '-1px',
          flexShrink: 0,
        }}>T</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-deep-navy)', lineHeight: 1.2 }}>
            HENZY
          </div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 400, lineHeight: 1 }}>
            어드민
          </div>
        </div>
      </div>

      {/* 데스크탑 탭 */}
      <div style={{ display: 'flex', flex: 1, gap: 0 }}>
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              padding: '15px 14px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--color-deep-navy)' : '#6B7280',
              borderBottom: isActive ? '2px solid var(--color-sky-blue)' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* 원장 배지 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: '#F5F0E8',
        borderRadius: 20,
        flexShrink: 0,
      }}>
        <div style={{
          width: 22, height: 22,
          background: 'var(--color-deep-navy)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', fontWeight: 700,
        }}>원</div>
        <span style={{ fontSize: 12, color: 'var(--color-deep-navy)', fontWeight: 600 }}>
          진해남문점
        </span>
      </div>
    </nav>
  );
}

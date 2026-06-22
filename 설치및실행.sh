#!/bin/bash

echo "🎓 TEENZ 리포트 시스템 설치를 시작합니다..."
echo ""

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    echo ""
    echo "👉 https://nodejs.org 에서 LTS 버전을 설치한 후 다시 실행해주세요."
    open "https://nodejs.org" 2>/dev/null || true
    exit 1
fi

echo "✅ Node.js $(node --version) 확인됨"
echo ""

# 백엔드 설치
echo "📦 백엔드 패키지 설치 중..."
cd "$(dirname "$0")"
npm install

# 프론트엔드 설치
echo ""
echo "📦 프론트엔드 패키지 설치 중..."
cd client
npm install
cd ..

# 샘플 데이터
echo ""
echo "🌱 샘플 데이터 생성 중..."
npm run setup

echo ""
echo "✅ 설치 완료!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 실행 방법:"
echo "   npm run dev"
echo ""
echo "🖥️  관리자 화면: http://localhost:5173"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 바로 실행할지 물어보기
read -p "지금 바로 실행할까요? (y/n): " yn
if [ "$yn" = "y" ] || [ "$yn" = "Y" ]; then
    npm run dev
fi

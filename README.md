# BigCat Social Growth MVP

GitHub Pages + Supabase DB로 시작하는 사회성 성장 포트폴리오 MVP입니다.

## 1. Supabase 세팅
1. Supabase에서 새 프로젝트 생성
2. SQL Editor 열기
3. `supabase-schema.sql` 전체 복사 후 Run
4. Project Settings → API에서 아래 값 확인
   - Project URL
   - anon public key

## 2. 앱 연결
`app.js` 상단의 아래 두 값을 바꾸세요.

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

## 3. GitHub Pages 배포
1. GitHub 새 repository 생성
2. `index.html`, `style.css`, `app.js`, `supabase-schema.sql`, `README.md` 업로드
3. Settings → Pages → Deploy from branch → main / root 저장
4. 발급된 GitHub Pages 주소로 접속

## 4. MVP 포함 기능
- 학부모: 아이 정보 입력 + 사회성 탐험 제출
- 교사: 아동 목록 확인 + 1학기/2학기 관찰 입력
- 리포트: 점수 그래프 + 성장 설명 + PDF 출력

## 5. 중요
현재 SQL policy는 MVP 테스트용으로 공개 읽기/쓰기를 허용합니다. 실제 기관 운영 전에는 반드시 로그인, 기관별 권한, 개인정보 보호 정책을 추가해야 합니다.

# Suprezip Implementation Plan

"알집, 반디집... 대단한 형님들이지만 이제는 세대교체가 필요한 시점입니다." 

Suprezip은 **Rust**의 강력한 성능과 **Tauri + Next.js**의 세련된 UI를 결합하여, 기존 압축 프로그램들을 압도하는 사용자 경험을 제공하는 것을 목표로 합니다. 특히 Zip64 지원과 코드 페이지 문제를 완벽하게 해결하여 '본질적으로 옳은' 압축 앱을 만듭니다.

## User Review Required

> [!IMPORTANT]
> **Tauri v2 + Next.js (App Router)** 조합으로 개발을 진행할 예정입니다. 웹 기술의 유연함과 Rust의 안전성을 동시에 챙기겠습니다.
> 디자인은 '프리미엄 감성'을 위해 **Glassmorphism**과 **다크 모드**를 기본으로 하며, 사용자 커스터마이징이 가능하도록 설계하겠습니다.

## Proposed Changes

---

### [Component] Backend (Rust Core)

Rust는 압축 성능의 핵심입니다. `zip` 크레이트와 `encoding_rs`를 사용하여 기술적 우위를 점하겠습니다.

#### [NEW] [src-tauri/src/lib.rs](file:///d:/suprezip/src-tauri/src/lib.rs)
- Tauri 커맨드 정의 (compress, extract, list_files)
- 에러 핸들링 및 상태 관리

#### [NEW] [src-tauri/src/zip_handler.rs](file:///d:/suprezip/src-tauri/src/zip_handler.rs)
- `zip` 크레이트를 이용한 Zip64 지원 압축/해제 로직
- 멀티스레딩(`rayon`)을 통한 대용량 처리 가속

#### [NEW] [src-tauri/src/encoding_util.rs](file:///d:/suprezip/src-tauri/src/encoding_util.rs)
- CP949(EUC-KR) 등 레거시 인코딩과 UTF-8 간의 변환 로직
- Zip 파일 내 파일명 깨짐 방지

---

### [Component] Frontend (Next.js GUI)

사용자에게 '와' 소리가 절로 나오는 디자인을 선사합니다.

#### [NEW] [src/app/page.tsx](file:///d:/suprezip/src/app/page.tsx)
- 메인 대시보드 및 드래그 앤 드롭 영역
- 압축 해제 진행 상황 시각화 (Progress bar)

#### [NEW] [src/components/Settings.tsx](file:///d:/suprezip/src/components/Settings.tsx)
- 코드 페이지 설정 (자동 감지 / 수동 선택)
- "압축 해제 후 폴더 열기" 등 옵션 관리

#### [NEW] [src/styles/globals.css](file:///d:/suprezip/src/styles/globals.css)
- 고급스러운 그라디언트와 애니메이션이 포함된 CSS 디자인 시스템

---

## Open Questions

> [!CAUTION]
> 1. **7z/RAR 지원 여부**: 현재 계획은 Zip/Zip64에 집중하고 있습니다. 7z 등을 단계적으로 추가할까요, 아니면 처음부터 올인원 가시겠습니까?
> 2. **OS 통합**: 우클릭 메뉴(쉘 익스텐션)는 윈도우 레지스트리 작업이 필요하여 초기 빌드에서는 앱 내 인터페이스에 집중하려 합니다. 동의하시나요?

## Verification Plan

### Automated Tests
- `cargo test`: 인코딩 변환 및 압축/해제 정합성 테스트
- 대용량 파일(4GB+) 테스트를 통한 Zip64 동작 확인

### Manual Verification
- **압축 해제**: 깨진 한글 이름이 포함된 옛날 zip 파일 해제 테스트
- **UI/UX**: 미려한 애니메이션과 드래스크 앤 드롭 기능 확인
- **폴더 열기**: 해제 완료 후 탐색기 자동 팝업 확인

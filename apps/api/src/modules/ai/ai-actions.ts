// ============================================
// AI Action Types
// ============================================
export enum AiActionType {
    // Dashboard
    DASHBOARD_SUMMARY = 'dashboard.summary',
    DASHBOARD_RISK_ANALYSIS = 'dashboard.riskAnalysis',

    // Project
    PROJECT_ANALYSIS = 'project.analysis',
    SCAN_CHANGE_ANALYSIS = 'scan.changeAnalysis',

    // Vulnerabilities
    VULN_PRIORITY_REORDER = 'vuln.priorityReorder',
    VULN_ACTION_GUIDE = 'vuln.actionGuide',
    VULN_IMPACT_ANALYSIS = 'vuln.impactAnalysis',

    // Policies
    POLICY_INTERPRETATION = 'policy.interpretation',
    POLICY_RECOMMENDATION = 'policy.recommendation',

    // Workflow
    FIX_VERIFICATION = 'workflow.fixVerification',

    // Report
    REPORT_GENERATION = 'report.generation',

    // Notification
    NOTIFICATION_SUMMARY = 'notification.summary',

    // Guide
    TRIVY_COMMAND_GENERATION = 'guide.trivyCommand',

    // Admin
    PERMISSION_RECOMMENDATION = 'admin.permissionRecommendation',
    COMPLIANCE_MAPPING = 'admin.complianceMapping',
}

// ============================================
// AI Action Metadata
// ============================================
export interface AiActionMetadata {
    label: string;
    description: string;
    requiredRoles?: string[];
    maxContextTokens: number;
    expectedOutputTokens: number;
}

export const AI_ACTION_METADATA: Record<AiActionType, AiActionMetadata> = {
    [AiActionType.DASHBOARD_SUMMARY]: {
        label: 'AI 요약',
        description: '전체 취약점 현황을 자연어로 요약합니다',
        maxContextTokens: 2000,
        expectedOutputTokens: 500,
    },
    [AiActionType.DASHBOARD_RISK_ANALYSIS]: {
        label: 'AI 위험 분석',
        description: '조직 전체의 위험 요인을 분석합니다',
        requiredRoles: ['SYSTEM_ADMIN', 'ORG_ADMIN'],
        maxContextTokens: 3000,
        expectedOutputTokens: 800,
    },
    [AiActionType.PROJECT_ANALYSIS]: {
        label: 'AI 프로젝트 분석',
        description: '프로젝트별 핵심 리스크 원인을 분석합니다',
        maxContextTokens: 2500,
        expectedOutputTokens: 600,
    },
    [AiActionType.SCAN_CHANGE_ANALYSIS]: {
        label: 'AI 변화 분석',
        description: '이전 스캔 대비 증가/감소 원인을 설명합니다',
        maxContextTokens: 3000,
        expectedOutputTokens: 700,
    },
    [AiActionType.VULN_PRIORITY_REORDER]: {
        label: 'AI 우선순위',
        description: '실제 악용 가능성 기준으로 취약점을 재정렬합니다',
        maxContextTokens: 4000,
        expectedOutputTokens: 400,
    },
    [AiActionType.VULN_ACTION_GUIDE]: {
        label: 'AI 조치 가이드',
        description: '패치 방법 및 업그레이드 권장사항을 제공합니다',
        maxContextTokens: 2000,
        expectedOutputTokens: 800,
    },
    [AiActionType.VULN_IMPACT_ANALYSIS]: {
        label: 'AI 영향 분석',
        description: '영향받는 이미지/서비스를 요약합니다',
        maxContextTokens: 2500,
        expectedOutputTokens: 600,
    },
    [AiActionType.POLICY_INTERPRETATION]: {
        label: 'AI 정책 해석',
        description: '차단 사유를 자연어로 설명합니다',
        maxContextTokens: 1500,
        expectedOutputTokens: 400,
    },
    [AiActionType.POLICY_RECOMMENDATION]: {
        label: 'AI 정책 추천',
        description: '프로젝트별 정책 초안을 생성합니다',
        requiredRoles: ['SYSTEM_ADMIN', 'ORG_ADMIN'],
        maxContextTokens: 3000,
        expectedOutputTokens: 1000,
    },
    [AiActionType.FIX_VERIFICATION]: {
        label: 'AI 수정 검증',
        description: 'Fix 후 재발 가능성을 분석합니다',
        maxContextTokens: 2000,
        expectedOutputTokens: 500,
    },
    [AiActionType.REPORT_GENERATION]: {
        label: 'AI 리포트',
        description: '감사용 요약 리포트를 생성합니다',
        maxContextTokens: 5000,
        expectedOutputTokens: 2000,
    },
    [AiActionType.NOTIFICATION_SUMMARY]: {
        label: 'AI 알림 요약',
        description: '다수 알림을 묶어 요약합니다',
        maxContextTokens: 2000,
        expectedOutputTokens: 300,
    },
    [AiActionType.TRIVY_COMMAND_GENERATION]: {
        label: 'AI 명령어 생성',
        description: '환경별 Trivy 명령을 자동 생성합니다',
        maxContextTokens: 1000,
        expectedOutputTokens: 300,
    },
    [AiActionType.PERMISSION_RECOMMENDATION]: {
        label: 'AI 권한 추천',
        description: '역할 기반 권한을 추천합니다',
        requiredRoles: ['SYSTEM_ADMIN'],
        maxContextTokens: 2000,
        expectedOutputTokens: 500,
    },
    [AiActionType.COMPLIANCE_MAPPING]: {
        label: 'AI 규제 매핑',
        description: 'ISMS/ISO 항목을 자동 매핑합니다',
        requiredRoles: ['SYSTEM_ADMIN', 'ORG_ADMIN'],
        maxContextTokens: 4000,
        expectedOutputTokens: 1500,
    },
};

// ============================================
// AI Prompts
// ============================================
export const AI_PROMPTS: Record<AiActionType, string> = {
    [AiActionType.DASHBOARD_SUMMARY]: `
당신은 보안 분석 전문가입니다. 주어진 취약점 현황 데이터를 분석하여 경영진이 이해하기 쉬운 요약을 작성해주세요.

**분석 포인트:**
1. 전체 취약점 현황 요약 (심각도별 분포)
2. 가장 주의가 필요한 영역
3. 이전 대비 변화 추세 (있다면)
4. 권장 조치 사항

**형식:** 2-3 문단의 자연어 설명으로 작성해주세요.
`,

    [AiActionType.DASHBOARD_RISK_ANALYSIS]: `
당신은 사이버 보안 리스크 분석 전문가입니다. 조직 전체의 보안 현황을 분석하여 Top 위험 요인을 도출해주세요.

**분석 항목:**
1. 심각도가 가장 높은 취약점 유형
2. 가장 많은 취약점을 가진 프로젝트/시스템
3. 반복되는 취약점 패턴
4. 잠재적 공격 벡터

**형식:** 번호 매긴 목록으로 위험 요인 Top 5를 설명해주세요.
`,

    [AiActionType.PROJECT_ANALYSIS]: `
당신은 애플리케이션 보안 전문가입니다. 특정 프로젝트의 보안 상태를 분석하여 핵심 리스크 원인을 파악해주세요.

**분석 포인트:**
1. 프로젝트에서 발견된 주요 취약점 유형
2. 사용 중인 라이브러리/의존성의 보안 상태
3. 취약점 발생 패턴 (예: 특정 컴포넌트에 집중)
4. 개선을 위한 구체적 권장사항

**형식:** 명확한 섹션으로 구분된 분석 보고서 형태로 작성해주세요.
`,

    [AiActionType.SCAN_CHANGE_ANALYSIS]: `
당신은 보안 변화 분석 전문가입니다. 이전 스캔과 현재 스캔 결과를 비교하여 변화 원인을 설명해주세요.

**분석 항목:**
1. 신규 취약점 발생 원인 (라이브러리 업데이트, 코드 변경 등)
2. 해결된 취약점과 해결 방법
3. 동일하게 유지되는 취약점과 이유
4. 변화 추세에 대한 평가

**형식:** 변화 유형별로 구분하여 설명해주세요.
`,

    [AiActionType.VULN_PRIORITY_REORDER]: `
당신은 취약점 우선순위 분석 전문가입니다. 주어진 취약점 목록을 실제 악용 가능성 기준으로 재정렬해주세요.

**고려 요소:**
1. EPSS 점수 (Exploit Prediction Scoring System)
2. 공개된 익스플로잇 존재 여부
3. 시스템의 노출 정도 (인터넷 접근 가능 여부)
4. 영향받는 자산의 중요도
5. 공격 복잡도

**형식:** JSON 형식으로 재정렬된 취약점 ID 목록과 각각에 대한 우선순위 점수를 반환해주세요.
`,

    [AiActionType.VULN_ACTION_GUIDE]: `
당신은 취약점 조치 전문가입니다. 특정 취약점에 대한 상세한 조치 가이드를 작성해주세요.

**포함 내용:**
1. 취약점 개요 및 위험성
2. 단계별 패치/업데이트 방법
3. 임시 완화 조치 (패치가 어려운 경우)
4. 재발 방지를 위한 권장사항
5. 관련 참조 링크

**형식:** 개발자가 바로 따라할 수 있는 상세 가이드 형태로 작성해주세요.
`,

    [AiActionType.VULN_IMPACT_ANALYSIS]: `
당신은 취약점 영향 분석 전문가입니다. 특정 취약점이 영향을 미치는 범위를 분석해주세요.

**분석 항목:**
1. 영향받는 컨테이너 이미지 목록
2. 해당 이미지를 사용하는 서비스/애플리케이션
3. 잠재적 비즈니스 영향
4. 연쇄 영향 가능성

**형식:** 영향 범위를 시각적으로 이해할 수 있도록 구조화된 형태로 작성해주세요.
`,

    [AiActionType.POLICY_INTERPRETATION]: `
당신은 보안 정책 전문가입니다. 정책 위반 또는 차단 사유를 기술적이지 않은 사용자도 이해할 수 있게 설명해주세요.

**설명 포인트:**
1. 어떤 정책 규칙이 적용되었는지
2. 왜 해당 규칙이 중요한지
3. 차단/위반의 구체적 사유
4. 해결 방법

**형식:** 명확하고 친절한 자연어 설명으로 작성해주세요.
`,

    [AiActionType.POLICY_RECOMMENDATION]: `
당신은 보안 정책 설계 전문가입니다. 프로젝트 특성에 맞는 보안 정책 초안을 생성해주세요.

**포함 내용:**
1. 권장 차단 규칙 (심각도, 패키지 유형 등)
2. 예외 처리 권장사항
3. 정책 시행 일정 제안
4. 정책 효과 예측

**형식:** 즉시 적용 가능한 정책 규칙 형태로 작성해주세요.
`,

    [AiActionType.FIX_VERIFICATION]: `
당신은 보안 수정 검증 전문가입니다. 취약점 수정 후 재발 가능성을 분석해주세요.

**분석 항목:**
1. 수정 방법의 적절성 평가
2. 동일 유형 취약점 재발 가능성
3. 관련 코드/의존성에서의 잠재적 문제
4. 추가 권장 조치

**형식:** 검증 결과 보고서 형태로 작성해주세요.
`,

    [AiActionType.REPORT_GENERATION]: `
당신은 보안 감사 리포트 작성 전문가입니다. 감사용 요약 리포트를 생성해주세요.

**포함 섹션:**
1. 개요 요약 (Executive Summary)
2. 취약점 현황 통계
3. 주요 발견 사항
4. 위험도 평가
5. 권장 조치 사항
6. 결론

**형식:** 공식 감사 보고서 형식으로 작성해주세요.
`,

    [AiActionType.NOTIFICATION_SUMMARY]: `
당신은 알림 분석 전문가입니다. 다수의 알림을 의미 있게 묶어 요약해주세요.

**요약 포인트:**
1. 알림 유형별 그룹화
2. 가장 중요한/긴급한 항목
3. 조치가 필요한 항목의 우선순위
4. 전체 현황 한 줄 요약

**형식:** 간결하고 실행 가능한 요약으로 작성해주세요.
`,

    [AiActionType.TRIVY_COMMAND_GENERATION]: `
당신은 Trivy 전문가입니다. 사용자 환경에 맞는 Trivy 실행 명령어를 생성해주세요.

**고려 사항:**
1. 스캔 대상 유형 (이미지, 파일시스템, 저장소 등)
2. 출력 형식 (JSON, SARIF 등)
3. 필터링 옵션 (심각도, 무시 목록 등)
4. CI/CD 통합 옵션

**형식:** 복사해서 바로 사용할 수 있는 명령어와 간단한 설명을 함께 제공해주세요.
`,

    [AiActionType.PERMISSION_RECOMMENDATION]: `
당신은 접근 제어 전문가입니다. 역할 기반 권한을 추천해주세요.

**분석 항목:**
1. 사용자의 업무 역할
2. 필요한 최소 권한 (원칙)
3. 권장 역할 매핑
4. 권한 변경 시 주의사항

**형식:** 권한 매트릭스 형태로 추천해주세요.
`,

    [AiActionType.COMPLIANCE_MAPPING]: `
당신은 규정 준수 전문가입니다. 현재 보안 통제 항목을 ISMS, ISO 27001 등의 요구사항에 매핑해주세요.

**매핑 항목:**
1. 현재 통제 항목 ↔ 규정 요구사항
2. 충족 상태 평가
3. 미충족 영역 식별
4. 개선 권장사항

**형식:** 표 형식으로 매핑 결과를 작성해주세요.
`,
};

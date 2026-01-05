'use client';

import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Info, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Shield,
  AlertTriangle,
  FileText,
  Clock,
  Server,
  HardDrive,
  Calendar,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Upload,
  Search,
  BarChart3,
  ExternalLink,
  Copy,
  Activity
} from 'lucide-react';

// Trivy DB Schema ERD definition
const trivyDbErd = `
erDiagram
    Vulnerability {
        string VulnerabilityID PK "CVE-XXXX-XXXXX"
        string Title "취약점 제목"
        string Description "상세 설명"
        string Severity "CRITICAL/HIGH/MEDIUM/LOW"
        string[] CweIDs "CWE-78, CWE-89"
        string[] References "참조 URL 목록"
        datetime PublishedDate "NVD 공개일"
        datetime LastModifiedDate "NVD 수정일"
    }
    
    Advisory {
        string VulnerabilityID FK "CVE ID 또는 벤더 ID"
        string[] VendorIDs "RHSA-ID, DSA-ID 등"
        string[] OSes "영향받는 OS"
        string[] Arches "영향받는 아키텍처"
        int Status "0:Unknown ~ 7:EndOfLife"
        int Severity "심각도 레벨"
        string FixedVersion "수정된 버전"
        string AffectedVersion "영향받는 버전"
        string[] VulnerableVersions "취약 버전 범위"
        string[] PatchedVersions "패치된 버전"
        string[] UnaffectedVersions "영향없는 버전"
    }
    
    DataSource {
        string ID PK "nvd, redhat, debian 등"
        string Name "데이터 소스 이름"
        string URL "소스 URL"
        string BaseID "기반 소스 ID"
    }
    
    CVSS {
        string V2Vector "CVSS v2 벡터"
        float V2Score "CVSS v2 점수"
        string V3Vector "CVSS v3.x 벡터"
        float V3Score "CVSS v3.x 점수"
        string V40Vector "CVSS v4.0 벡터"
        float V40Score "CVSS v4.0 점수"
    }
    
    VendorSeverity {
        string SourceID FK "벤더 ID"
        int Severity "벤더별 심각도"
    }
    
    VendorCVSS {
        string SourceID FK "벤더 ID"
    }
    
    Advisories {
        string FixedVersion "하위 호환용"
        Advisory[] Entries "권고 항목 목록"
    }
    
    Vulnerability ||--o{ VendorSeverity : "has vendor severities"
    Vulnerability ||--o{ VendorCVSS : "has vendor CVSS"
    VendorCVSS ||--|| CVSS : "contains"
    Advisory ||--o| DataSource : "comes from"
    Advisory }|--|| Vulnerability : "references"
    Advisories ||--o{ Advisory : "contains"
`;

// Status enum mapping
const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: 'Unknown', color: 'gray' },
  1: { label: 'Not Affected', color: 'green' },
  2: { label: 'Affected', color: 'red' },
  3: { label: 'Fixed', color: 'blue' },
  4: { label: 'Under Investigation', color: 'yellow' },
  5: { label: 'Will Not Fix', color: 'orange' },
  6: { label: 'Fix Deferred', color: 'purple' },
  7: { label: 'End of Life', color: 'gray' },
};

// Severity enum mapping
const severityMap: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  0: { label: 'Unknown', color: '#6B7280', icon: <Info className="w-4 h-4" /> },
  1: { label: 'Low', color: '#10B981', icon: <Shield className="w-4 h-4" /> },
  2: { label: 'Medium', color: '#F59E0B', icon: <AlertTriangle className="w-4 h-4" /> },
  3: { label: 'High', color: '#EF4444', icon: <AlertTriangle className="w-4 h-4" /> },
  4: { label: 'Critical', color: '#7C3AED', icon: <AlertTriangle className="w-4 h-4" /> },
};

// Data sources information
const dataSources = [
  { id: 'nvd', name: 'National Vulnerability Database', url: 'https://nvd.nist.gov/' },
  { id: 'redhat', name: 'Red Hat Security Data', url: 'https://access.redhat.com/security/data' },
  { id: 'debian', name: 'Debian Security Bug Tracker', url: 'https://security-tracker.debian.org/' },
  { id: 'ubuntu', name: 'Ubuntu Security Notices', url: 'https://ubuntu.com/security/notices' },
  { id: 'alpine', name: 'Alpine SecDB', url: 'https://secdb.alpinelinux.org/' },
  { id: 'amazon', name: 'Amazon Linux Security Center', url: 'https://alas.aws.amazon.com/' },
  { id: 'ghsa', name: 'GitHub Security Advisory', url: 'https://github.com/advisories' },
  { id: 'golang', name: 'Go Vulnerability Database', url: 'https://vuln.go.dev/' },
];

interface DbMetadata {
  Version: number;
  NextUpdate: string;
  UpdatedAt: string;
  DownloadedAt: string;
}

export default function TrivyDbPage() {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'erd' | 'files' | 'stats' | 'query' | 'types' | 'sources'>('erd');
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Query state
  const [cveQuery, setCveQuery] = useState('');
  const [packageQuery, setPackageQuery] = useState('');
  const [packageVersion, setPackageVersion] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Live DB info state
  const [dbInfo, setDbInfo] = useState<{
    exists: boolean;
    metadata: DbMetadata | null;
    javaMetadata: DbMetadata | null;
    files: { name: string; size: number; lastModified: string }[];
    totalSize: number;
    location: string;
    trivyVersion: string | null;
    isHealthy: boolean;
  } | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState<{
    sources: { name: string; count: number }[];
    totalVulnerabilities: number;
    lastUpdated: string | null;
  } | null>(null);

  // Fetch live DB info from API
  const fetchDbInfo = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await fetch('/api/trivy-db/info');
      if (res.ok) {
        const data = await res.json();
        setDbInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch DB info:', error);
    } finally {
      setIsDbLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/trivy-db/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Handle file upload with progress tracking
  const handleFileUpload = async (files: FileList) => {
    const formData = new FormData();
    let totalSize = 0;
    Array.from(files).forEach((file) => {
      formData.append('files', file);
      totalSize += file.size;
    });

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    // Use XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      setIsUploading(false);
      try {
        const result = JSON.parse(xhr.responseText);
        setUploadStatus({
          success: result.success,
          message: result.message || (result.success 
            ? `업로드 완료: ${result.uploaded.join(', ')}`
            : `오류: ${result.errors.join(', ')}`),
        });
        if (result.success) {
          fetchDbInfo(true);
          fetchStats();
        }
      } catch {
        setUploadStatus({ success: false, message: '응답 파싱 실패' });
      }
    });

    xhr.addEventListener('error', () => {
      setIsUploading(false);
      setUploadStatus({ success: false, message: '업로드 실패: 네트워크 오류' });
    });

    xhr.addEventListener('abort', () => {
      setIsUploading(false);
      setUploadStatus({ success: false, message: '업로드 취소됨' });
    });

    xhr.open('POST', '/api/trivy-db/upload');
    xhr.send(formData);
  };

  // Query CVE
  const queryCve = async () => {
    if (!cveQuery.trim()) return;
    setIsQuerying(true);
    setQueryResult(null);
    try {
      const res = await fetch(`/api/trivy-db/query/cve?id=${encodeURIComponent(cveQuery)}`);
      const data = await res.json();
      setQueryResult({ type: 'cve', ...data });
    } catch (error) {
      setQueryResult({ type: 'cve', found: false, message: '조회 실패' });
    } finally {
      setIsQuerying(false);
    }
  };

  // Query package
  const queryPackage = async () => {
    if (!packageQuery.trim()) return;
    setIsQuerying(true);
    setQueryResult(null);
    try {
      const url = packageVersion 
        ? `/api/trivy-db/query/package?name=${encodeURIComponent(packageQuery)}&version=${encodeURIComponent(packageVersion)}`
        : `/api/trivy-db/query/package?name=${encodeURIComponent(packageQuery)}`;
      const res = await fetch(url);
      const data = await res.json();
      setQueryResult({ type: 'package', ...data });
    } catch (error) {
      setQueryResult({ type: 'package', message: '조회 실패' });
    } finally {
      setIsQuerying(false);
    }
  };

  useEffect(() => {
    fetchDbInfo();
    fetchStats();
  }, []);

  // Render Mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#6366f1',
            primaryTextColor: '#fff',
            primaryBorderColor: '#818cf8',
            lineColor: '#94a3b8',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
            background: '#0f172a',
            mainBkg: '#1e293b',
            nodeBorder: '#6366f1',
            clusterBkg: '#1e293b',
            titleColor: '#f1f5f9',
            edgeLabelBackground: '#1e293b',
          },
          er: {
            diagramPadding: 20,
            layoutDirection: 'TB',
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
            useMaxWidth: false,
          },
        });

        const { svg } = await mermaid.render('trivy-erd', trivyDbErd);
        setSvgContent(svg);
        setIsLoading(false);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, []);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.3));
  const handleResetZoom = () => setZoom(1);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Trivy Vulnerability Database</h1>
              <p className="text-slate-400">스키마 구조 및 ERD 시각화</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDbInfo(true)}
              disabled={isRefreshing}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <a
              href="https://github.com/aquasecurity/trivy-db"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              GitHub
            </a>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              DB 업로드
            </button>
            <button
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 transition-colors"
              onClick={() => {
                // Trigger download script info
                alert('PowerShell에서 실행:\n.\\script\\download-trivy-db.ps1');
              }}
            >
              <Download className="w-4 h-4" />
              DB 동기화
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">DB 버전</p>
              <p className="text-white font-semibold">
                {isDbLoading ? '로딩...' : dbInfo?.metadata?.Version ?? 'N/A'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${dbInfo?.exists ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <RefreshCw className={`w-5 h-5 ${dbInfo?.exists ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">DB 상태</p>
              <p className={`font-semibold ${dbInfo?.exists ? 'text-green-400' : 'text-red-400'}`}>
                {isDbLoading ? '확인 중...' : dbInfo?.exists ? '동기화됨' : 'DB 없음'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Server className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">전체 크기</p>
              <p className="text-white font-semibold">
                {isDbLoading ? '계산 중...' : formatSize(dbInfo?.totalSize ?? 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">파일 수</p>
              <p className="text-white font-semibold">
                {isDbLoading ? '...' : `${dbInfo?.files?.length ?? 0}개 파일`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['erd', 'files', 'stats', 'query', 'types', 'sources'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {tab === 'erd' && 'ERD 다이어그램'}
            {tab === 'files' && 'DB 파일'}
            {tab === 'stats' && '취약점 통계'}
            {tab === 'query' && 'DB 조회'}
            {tab === 'types' && '타입 정의'}
            {tab === 'sources' && '데이터 소스'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {activeTab === 'erd' && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Entity Relationship Diagram</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <span className="text-slate-400 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
              >
                Reset
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* ERD Container */}
          <div
            className="overflow-auto p-8"
            style={{ maxHeight: '600px' }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div
                className="flex justify-center"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease',
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* DB Files Table */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                데이터베이스 파일
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">파일명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">크기</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">마지막 수정</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {dbInfo?.files?.map((file) => (
                    <tr key={file.name} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-slate-400" />
                          <span className="text-white font-medium">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {formatDate(file.lastModified)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          존재함
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!dbInfo?.files || dbInfo.files.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        <XCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                        DB 파일이 없습니다. 동기화를 실행하세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main DB Metadata */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                취약점 DB 정보
              </h3>
              {dbInfo?.metadata ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">버전</span>
                    <span className="text-white font-semibold">{dbInfo.metadata.Version}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">다운로드 일시</span>
                    <span className="text-white">{formatDate(dbInfo.metadata.DownloadedAt)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">업데이트 일시</span>
                    <span className="text-white">{formatDate(dbInfo.metadata.UpdatedAt)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">다음 업데이트</span>
                    <span className="text-white">{formatDate(dbInfo.metadata.NextUpdate)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">메타데이터를 찾을 수 없습니다</p>
              )}
            </div>

            {/* Java DB Metadata */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-400" />
                Java DB 정보
              </h3>
              {dbInfo?.javaMetadata ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">버전</span>
                    <span className="text-white font-semibold">{dbInfo.javaMetadata.Version}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">다운로드 일시</span>
                    <span className="text-white">{formatDate(dbInfo.javaMetadata.DownloadedAt)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">업데이트 일시</span>
                    <span className="text-white">{formatDate(dbInfo.javaMetadata.UpdatedAt)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400">다음 업데이트</span>
                    <span className="text-white">{formatDate(dbInfo.javaMetadata.NextUpdate)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">메타데이터를 찾을 수 없습니다</p>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-green-400" />
              저장 위치
            </h3>
            <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
              <code className="text-indigo-400 flex-1 font-mono text-sm break-all">
                {dbInfo?.location || 'N/A'}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(dbInfo?.location || '');
                }}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
              >
                복사
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Types */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Status 타입
            </h3>
            <div className="space-y-2">
              {Object.entries(statusMap).map(([key, { label, color }]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                >
                  <span className="text-slate-300">
                    <span className="text-indigo-400 font-mono">{key}</span> - {label}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium`}
                    style={{
                      backgroundColor: `${color === 'gray' ? '#6B7280' : color === 'green' ? '#10B981' : color === 'red' ? '#EF4444' : color === 'blue' ? '#3B82F6' : color === 'yellow' ? '#F59E0B' : color === 'orange' ? '#F97316' : '#8B5CF6'}20`,
                      color: color === 'gray' ? '#9CA3AF' : color === 'green' ? '#34D399' : color === 'red' ? '#F87171' : color === 'blue' ? '#60A5FA' : color === 'yellow' ? '#FBBF24' : color === 'orange' ? '#FB923C' : '#A78BFA',
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Types */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Severity 타입
            </h3>
            <div className="space-y-2">
              {Object.entries(severityMap).map(([key, { label, color, icon }]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                >
                  <span className="text-slate-300">
                    <span className="text-indigo-400 font-mono">{key}</span> - {label}
                  </span>
                  <span
                    className="px-3 py-1 rounded flex items-center gap-2 text-sm font-medium"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                    }}
                  >
                    {icon}
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CVSS Info */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-400" />
              CVSS (Common Vulnerability Scoring System)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <h4 className="text-indigo-400 font-medium mb-2">CVSS v2</h4>
                <p className="text-slate-400 text-sm">
                  V2Vector: 공격 벡터 문자열<br />
                  V2Score: 0.0 ~ 10.0 점수
                </p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <h4 className="text-indigo-400 font-medium mb-2">CVSS v3.x</h4>
                <p className="text-slate-400 text-sm">
                  V3Vector: CVSS:3.1/AV:N/...<br />
                  V3Score: 0.0 ~ 10.0 점수
                </p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <h4 className="text-indigo-400 font-medium mb-2">CVSS v4.0</h4>
                <p className="text-slate-400 text-sm">
                  V40Vector: 최신 CVSS 표준<br />
                  V40Score: 0.0 ~ 10.0 점수
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-400" />
            취약점 데이터 소스
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dataSources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs font-mono uppercase">
                    {source.id}
                  </span>
                </div>
                <p className="text-white font-medium group-hover:text-indigo-400 transition-colors">
                  {source.name}
                </p>
                <p className="text-slate-500 text-sm truncate mt-1">{source.url}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Stats Tab Content */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur border border-indigo-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/30 rounded-xl">
                  <Activity className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">총 취약점 수</p>
                  <p className="text-3xl font-bold text-white">
                    {stats?.totalVulnerabilities?.toLocaleString() ?? '---'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/30 rounded-xl">
                  <Server className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Trivy 버전</p>
                  <p className="text-xl font-bold text-white">
                    {dbInfo?.trivyVersion ?? 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 backdrop-blur border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${dbInfo?.isHealthy ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                  {dbInfo?.isHealthy ? (
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-slate-400 text-sm">DB 상태</p>
                  <p className={`text-xl font-bold ${dbInfo?.isHealthy ? 'text-green-400' : 'text-red-400'}`}>
                    {dbInfo?.isHealthy ? '정상' : '문제 있음'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Source Distribution */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              데이터 소스별 취약점 분포 (추정)
            </h3>
            <div className="space-y-4">
              {stats?.sources?.map((source, index) => {
                const maxCount = Math.max(...(stats.sources?.map(s => s.count) || [1]));
                const percentage = maxCount > 0 ? (source.count / maxCount) * 100 : 0;
                const colors = [
                  'bg-indigo-500', 'bg-red-500', 'bg-blue-500', 'bg-orange-500',
                  'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'
                ];
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{source.name}</span>
                      <span className="text-slate-400">{source.count.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-slate-500 text-xs mt-4">
              * 통계는 DB 파일 크기를 기반으로 추정한 값입니다.
            </p>
          </div>
        </div>
      )}

      {/* Query Tab Content */}
      {activeTab === 'query' && (
        <div className="space-y-6">
          {/* Search Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CVE Search */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                CVE 조회
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">CVE ID</label>
                  <input
                    type="text"
                    value={cveQuery}
                    onChange={(e) => setCveQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && queryCve()}
                    placeholder="예: CVE-2021-44228"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={queryCve}
                  disabled={isQuerying || !cveQuery.trim()}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isQuerying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  조회
                </button>
              </div>
            </div>

            {/* Package Search */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-orange-400" />
                패키지 취약점 검사
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">패키지명</label>
                  <input
                    type="text"
                    value={packageQuery}
                    onChange={(e) => setPackageQuery(e.target.value)}
                    placeholder="예: lodash"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">버전 (선택)</label>
                  <input
                    type="text"
                    value={packageVersion}
                    onChange={(e) => setPackageVersion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && queryPackage()}
                    placeholder="예: 4.17.20"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={queryPackage}
                  disabled={isQuerying || !packageQuery.trim()}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isQuerying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  검사
                </button>
              </div>
            </div>
          </div>

          {/* Query Results */}
          {queryResult && (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-400" />
                조회 결과
              </h3>
              
              {queryResult.type === 'cve' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${queryResult.found ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {queryResult.cveId}
                    </span>
                  </div>
                  <p className="text-slate-300">{queryResult.message}</p>
                  {queryResult.details?.links && (
                    <div className="space-y-2">
                      <p className="text-slate-400 text-sm">참조 링크:</p>
                      {queryResult.details.links.map((link: string, i: number) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {link}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {queryResult.type === 'package' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-500/20 text-orange-400">
                      {queryResult.packageName}
                      {queryResult.version && ` @ ${queryResult.version}`}
                    </span>
                  </div>
                  <p className="text-slate-300">{queryResult.message}</p>
                  
                  {queryResult.vulnerabilities?.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-700/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-slate-400">CVE ID</th>
                            <th className="px-4 py-2 text-left text-slate-400">심각도</th>
                            <th className="px-4 py-2 text-left text-slate-400">수정 버전</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {queryResult.vulnerabilities.map((vuln: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-700/30">
                              <td className="px-4 py-2 text-indigo-400">{vuln.VulnerabilityID}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  vuln.Severity === 'CRITICAL' ? 'bg-purple-500/20 text-purple-400' :
                                  vuln.Severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                  vuln.Severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {vuln.Severity}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-300">{vuln.FixedVersion || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Trivy CLI Info */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">
              💡 전체 프로젝트 스캔을 위해 Trivy CLI를 사용하세요: 
              <code className="ml-2 px-2 py-1 bg-slate-700 rounded text-indigo-400">trivy fs --severity CRITICAL,HIGH .</code>
            </p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-400" />
                Trivy DB 파일 업로드
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadStatus(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-400 text-sm mb-4">
              오프라인 환경에서 Trivy DB를 수동으로 업로드할 수 있습니다.
              다음 파일들을 업로드하세요:
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <code>trivy.db</code> (필수)
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <code>metadata.json</code> (필수)
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <HardDrive className="w-4 h-4 text-orange-400" />
                <code>trivy-java.db</code> (선택)
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <HardDrive className="w-4 h-4 text-orange-400" />
                <code>java-metadata.json</code> (선택)
              </div>
            </div>

            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center mb-4 hover:border-indigo-500 transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-500/10');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-500/10');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-500/10');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files);
                }
              }}
            >
              <input
                type="file"
                multiple
                accept=".db,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files);
                  }
                }}
                className="hidden"
                id="db-upload"
              />
              <label htmlFor="db-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-300">클릭하여 파일 선택</p>
                <p className="text-slate-500 text-sm">또는 파일을 여기에 드래그</p>
              </label>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-300">업로드 중...</span>
                  <span className="text-indigo-400 font-medium">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  대용량 파일은 시간이 걸릴 수 있습니다. 창을 닫지 마세요.
                </p>
              </div>
            )}

            {uploadStatus && (
              <div className={`p-3 rounded-lg mb-4 ${uploadStatus.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {uploadStatus.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadStatus(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
        <p className="text-slate-400 text-sm text-center">
          Trivy DB는 <a href="https://github.com/aquasecurity/trivy-db" className="text-indigo-400 hover:underline">aquasecurity/trivy-db</a>에서 
          관리되며, BoltDB 형식으로 저장됩니다. 
          데이터는 NVD, Red Hat, Debian, Ubuntu, Alpine, Amazon Linux, GitHub Advisory 등에서 수집됩니다.
        </p>
      </div>
    </div>
  );
}

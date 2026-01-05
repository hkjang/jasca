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
  FolderOpen
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
  const [activeTab, setActiveTab] = useState<'erd' | 'types' | 'sources' | 'files'>('erd');
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Live DB info state
  const [dbInfo, setDbInfo] = useState<{
    exists: boolean;
    metadata: DbMetadata | null;
    javaMetadata: DbMetadata | null;
    files: { name: string; size: number; lastModified: string }[];
    totalSize: number;
    location: string;
  } | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);

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

  useEffect(() => {
    fetchDbInfo();
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
      <div className="flex gap-2 mb-4">
        {(['erd', 'files', 'types', 'sources'] as const).map((tab) => (
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

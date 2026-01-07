'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Database,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  List,
  Grid3X3,
  ChevronRight,
  ChevronDown,
  Key,
  Link as LinkIcon,
  Hash,
  Calendar,
  Type,
  ToggleLeft,
  FileJson,
  Layers,
  RefreshCw,
  Move,
  Map,
  Focus,
  RotateCcw,
  ChevronUp,
} from 'lucide-react';
import {
  ParsedSchema,
  SchemaModel,
  parsePrismaSchema,
  generateMermaidERD,
  getSchemaStats,
} from '@/lib/schema-parser';

// Mermaid will be loaded dynamically on client-side
let mermaid: typeof import('mermaid').default | null = null;

interface ERDViewerProps {
  schemaContent: string;
}

const fieldTypeIcons: Record<string, React.ElementType> = {
  String: Type,
  Int: Hash,
  Float: Hash,
  Boolean: ToggleLeft,
  DateTime: Calendar,
  Json: FileJson,
};

// Model category groups for organized display
const MODEL_CATEGORIES: Record<string, string[]> = {
  '조직/프로젝트': ['Organization', 'Project', 'Registry'],
  '사용자/인증': ['User', 'UserRole', 'ApiToken', 'UserSession', 'LoginHistory', 'UserInvitation', 'UserMfa', 'EmailVerification', 'SsoConfig', 'IpWhitelist', 'PasswordPolicy', 'PasswordHistory'],
  '스캔/취약점': ['ScanResult', 'ScanSummary', 'Vulnerability', 'ScanVulnerability', 'VulnerabilityComment', 'VulnerabilityImpact', 'VulnerabilityBookmark', 'MergedVulnerability', 'MitreMapping'],
  '정책/예외': ['Policy', 'PolicyRule', 'PolicyException'],
  '워크플로우': ['VulnerabilityWorkflow', 'FixEvidence'],
  '알림': ['NotificationChannel', 'NotificationRule', 'UserNotification'],
  '보고서': ['ReportTemplate', 'Report'],
  '통합': ['GitIntegration', 'GitRepository', 'IssueTrackerIntegration', 'LinkedIssue'],
  '설정/기타': ['RiskScoreConfig', 'AssetCriticality', 'AuditLog', 'SystemSettings', 'AiExecution'],
};

export function ERDViewer({ schemaContent }: ERDViewerProps) {
  const [schema, setSchema] = useState<ParsedSchema | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<SchemaModel | null>(null);
  const [viewMode, setViewMode] = useState<'erd' | 'list'>('erd');
  const [zoom, setZoom] = useState(50); // Start with lower zoom for better overview
  const [showFields, setShowFields] = useState(true);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(MODEL_CATEGORIES)));
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Parse schema
  useEffect(() => {
    if (schemaContent) {
      const parsed = parsePrismaSchema(schemaContent);
      setSchema(parsed);
    }
  }, [schemaContent]);

  // Initialize mermaid and render
  useEffect(() => {
    const initMermaid = async () => {
      if (typeof window !== 'undefined') {
        const mermaidModule = await import('mermaid');
        mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          er: {
            diagramPadding: 20,
            layoutDirection: 'TB',
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
            useMaxWidth: false,
          },
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#f1f5f9',
            primaryBorderColor: '#475569',
            lineColor: '#64748b',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
          },
        });
      }
    };

    initMermaid();
  }, []);

  // Generate ERD SVG
  useEffect(() => {
    const renderDiagram = async () => {
      if (!schema || !mermaid || viewMode !== 'erd') return;

      setIsLoading(true);
      try {
        const mermaidCode = generateMermaidERD(schema, {
          includeFields: showFields,
          maxFieldsPerModel: 8,
          highlightModel: selectedModel?.name,
        });

        const id = 'erd-diagram-' + Date.now();
        const { svg } = await mermaid.render(id, mermaidCode);
        setMermaidSvg(svg);
        
        // Extract SVG dimensions after render
        setTimeout(() => {
          const svgElement = contentRef.current?.querySelector('svg');
          if (svgElement) {
            const rect = svgElement.getBoundingClientRect();
            setSvgDimensions({ width: rect.width, height: rect.height });
          }
        }, 100);
      } catch (error) {
        console.error('Failed to render ERD:', error);
        setMermaidSvg('<div class="text-red-500 p-4">ERD 렌더링 실패</div>');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [schema, showFields, selectedModel, viewMode]);

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!schema) return [];
    if (!searchQuery) return schema.models;
    const query = searchQuery.toLowerCase();
    return schema.models.filter(
      model =>
        model.name.toLowerCase().includes(query) ||
        model.fields.some(f => f.name.toLowerCase().includes(query))
    );
  }, [schema, searchQuery]);

  // Filter enums based on search
  const filteredEnums = useMemo(() => {
    if (!schema) return [];
    if (!searchQuery) return schema.enums;
    const query = searchQuery.toLowerCase();
    return schema.enums.filter(
      e =>
        e.name.toLowerCase().includes(query) ||
        e.values.some(v => v.toLowerCase().includes(query))
    );
  }, [schema, searchQuery]);

  // Group models by category
  const modelsByCategory = useMemo(() => {
    const grouped: Record<string, SchemaModel[]> = {};
    const assignedModels = new Set<string>();
    
    // First, assign models to their categories
    for (const [category, modelNames] of Object.entries(MODEL_CATEGORIES)) {
      grouped[category] = filteredModels.filter(m => {
        if (modelNames.includes(m.name)) {
          assignedModels.add(m.name);
          return true;
        }
        return false;
      });
    }
    
    // Add uncategorized models
    const uncategorized = filteredModels.filter(m => !assignedModels.has(m.name));
    if (uncategorized.length > 0) {
      grouped['기타'] = uncategorized;
    }
    
    return grouped;
  }, [filteredModels]);

  // Stats
  const stats = useMemo(() => {
    if (!schema) return null;
    return getSchemaStats(schema);
  }, [schema]);

  // Toggle model expansion
  const toggleModel = useCallback((modelName: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev);
      if (next.has(modelName)) {
        next.delete(modelName);
      } else {
        next.add(modelName);
      }
      return next;
    });
  }, []);

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Zoom handlers with finer control
  const handleZoomIn = () => setZoom(z => Math.min(z + 10, 200));
  const handleZoomOut = () => setZoom(z => Math.max(z - 10, 10));
  const handleZoomReset = () => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  };

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    
    const container = containerRef.current;
    const svgElement = contentRef.current.querySelector('svg');
    if (!svgElement) return;
    
    const containerRect = container.getBoundingClientRect();
    const svgRect = svgElement.getBoundingClientRect();
    
    // Calculate the scale needed to fit the SVG in the container
    const scaleX = (containerRect.width - 40) / (svgRect.width / (zoom / 100));
    const scaleY = (containerRect.height - 40) / (svgRect.height / (zoom / 100));
    const newZoom = Math.min(scaleX, scaleY) * 100;
    
    setZoom(Math.max(10, Math.min(200, Math.floor(newZoom))));
    setPanOffset({ x: 0, y: 0 });
  }, [zoom]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setZoom(z => Math.max(10, Math.min(200, z + delta)));
    }
  }, []);

  // Minimap navigation
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !minimapRef.current) return;
    
    const minimap = minimapRef.current;
    const rect = minimap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate the relative position and set pan offset
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const scaleX = svgDimensions.width / rect.width;
    const scaleY = svgDimensions.height / rect.height;
    
    const newPanX = -(x * scaleX * (zoom / 100) - containerRect.width / 2);
    const newPanY = -(y * scaleY * (zoom / 100) - containerRect.height / 2);
    
    setPanOffset({ x: newPanX, y: newPanY });
  };

  // Calculate minimap viewport indicator
  const minimapViewport = useMemo(() => {
    if (!containerRef.current || svgDimensions.width === 0) return null;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const scaledWidth = svgDimensions.width * (zoom / 100);
    const scaledHeight = svgDimensions.height * (zoom / 100);
    
    const minimapWidth = 160;
    const minimapHeight = 100;
    
    const scaleX = minimapWidth / scaledWidth;
    const scaleY = minimapHeight / scaledHeight;
    const scale = Math.min(scaleX, scaleY);
    
    return {
      width: Math.min(minimapWidth, containerRect.width * scale),
      height: Math.min(minimapHeight, containerRect.height * scale),
      left: Math.max(0, -panOffset.x * scale),
      top: Math.max(0, -panOffset.y * scale),
    };
  }, [zoom, panOffset, svgDimensions]);

  // Export as SVG
  const handleExport = () => {
    if (!mermaidSvg) return;
    const blob = new Blob([mermaidSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema-erd.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Zoom presets
  const zoomPresets = [25, 50, 75, 100, 150];

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-800 rounded-lg">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
          <p className="mt-2 text-slate-400">스키마 파싱 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Stats - Compact */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          {[
            { icon: Database, label: '모델', value: stats.modelCount },
            { icon: Layers, label: 'Enum', value: stats.enumCount },
            { icon: Hash, label: '필드', value: stats.totalFields },
            { icon: LinkIcon, label: '관계', value: stats.totalRelations },
            { icon: Key, label: '인덱스', value: stats.totalIndexes },
            { icon: Hash, label: '평균', value: stats.avgFieldsPerModel },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-2 border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <stat.icon className="h-3 w-3" />
                {stat.label}
              </div>
              <div className="text-lg font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="모델/필드 검색..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
          <button
            onClick={() => setViewMode('erd')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
              viewMode === 'erd' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            ERD
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            목록
          </button>
        </div>

        {/* ERD Controls */}
        {viewMode === 'erd' && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={showFields}
                onChange={e => setShowFields(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              필드
            </label>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg border border-slate-700 p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="축소 (10%)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              
              {/* Zoom dropdown */}
              <select
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="bg-slate-700 text-white text-xs px-1 py-0.5 rounded border-0 focus:ring-1 focus:ring-blue-500 w-14"
              >
                {zoomPresets.map(z => (
                  <option key={z} value={z}>{z}%</option>
                ))}
                {!zoomPresets.includes(zoom) && <option value={zoom}>{zoom}%</option>}
              </select>
              
              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="확대 (10%)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg border border-slate-700 p-0.5">
              <button
                onClick={handleFitToScreen}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="화면에 맞추기"
              >
                <Focus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleZoomReset}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="초기화 (100%)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowMinimap(!showMinimap)}
                className={`p-1 rounded ${showMinimap ? 'text-blue-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title="미니맵"
              >
                <Map className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              SVG
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Sidebar - Categorized Model List */}
        <div className="w-56 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-medium text-white text-sm">모델 ({filteredModels.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {Object.entries(modelsByCategory).map(([category, models]) => {
              if (models.length === 0) return null;
              return (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                  >
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {category}
                    <span className="ml-auto text-slate-500">{models.length}</span>
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="ml-2 space-y-0.5">
                      {models.map(model => (
                        <button
                          key={model.name}
                          onClick={() => {
                            setSelectedModel(model);
                            toggleModel(model.name);
                          }}
                          className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left transition-colors ${
                            selectedModel?.name === model.name
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Database className="h-3 w-3 flex-shrink-0 text-blue-400" />
                          <span className="truncate">{model.name}</span>
                          <span className="ml-auto text-[10px] text-slate-500">{model.fields.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enums Section - Collapsible */}
          <div className="border-t border-slate-700">
            <button
              onClick={() => toggleCategory('__enums__')}
              className="w-full p-2 flex items-center justify-between text-sm font-medium text-white hover:bg-slate-700/50"
            >
              <span>Enum ({filteredEnums.length})</span>
              {expandedCategories.has('__enums__') ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expandedCategories.has('__enums__') && (
              <div className="max-h-32 overflow-y-auto p-1.5 space-y-0.5">
                {filteredEnums.map(enumDef => (
                  <div
                    key={enumDef.name}
                    className="px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded cursor-pointer"
                    title={enumDef.values.join(', ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3 w-3 text-green-400" />
                      <span className="truncate">{enumDef.name}</span>
                      <span className="ml-auto text-[10px] text-slate-500">{enumDef.values.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden relative">
          {viewMode === 'erd' ? (
            <>
              <div
                ref={containerRef}
                className="w-full h-full overflow-hidden"
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                      <p className="mt-2 text-slate-400 text-sm">다이어그램 생성 중...</p>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={contentRef}
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                      transformOrigin: 'top left',
                      minWidth: 'max-content',
                      padding: '20px',
                    }}
                    dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                  />
                )}
              </div>

              {/* Minimap */}
              {showMinimap && !isLoading && svgDimensions.width > 0 && (
                <div
                  ref={minimapRef}
                  className="absolute bottom-3 right-3 w-40 h-24 bg-slate-900/90 border border-slate-600 rounded-lg overflow-hidden cursor-crosshair shadow-lg"
                  onClick={handleMinimapClick}
                >
                  <div
                    className="w-full h-full opacity-30"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(mermaidSvg)}")`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  />
                  {/* Viewport indicator */}
                  {minimapViewport && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-500/20 rounded"
                      style={{
                        width: minimapViewport.width,
                        height: minimapViewport.height,
                        left: minimapViewport.left,
                        top: minimapViewport.top,
                      }}
                    />
                  )}
                  <div className="absolute top-1 left-1 text-[9px] text-slate-400 bg-slate-900/80 px-1 rounded">
                    미니맵
                  </div>
                </div>
              )}

              {/* Pan instruction */}
              <div className="absolute bottom-3 left-3 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded flex items-center gap-1.5">
                <Move className="h-3 w-3" />
                드래그하여 이동 | Ctrl+휠로 확대/축소
              </div>
            </>
          ) : (
            <div className="h-full overflow-auto">
              {/* List View */}
              <div className="p-3 space-y-3">
                {filteredModels.map(model => (
                  <div
                    key={model.name}
                    className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
                      <Database className="h-4 w-4 text-blue-400" />
                      <h3 className="font-medium text-white text-sm">{model.name}</h3>
                      <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-700 rounded">
                        {model.fields.length} fields
                      </span>
                    </div>
                    <div className="p-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-700">
                            <th className="pb-1.5 font-medium">필드</th>
                            <th className="pb-1.5 font-medium">타입</th>
                            <th className="pb-1.5 font-medium">속성</th>
                          </tr>
                        </thead>
                        <tbody>
                          {model.fields.map(field => (
                            <tr key={field.name} className="border-b border-slate-800 last:border-0">
                              <td className="py-1.5 text-white flex items-center gap-1.5">
                                {field.isPrimaryKey && <Key className="h-3 w-3 text-yellow-500" />}
                                {field.relation && !field.isPrimaryKey && <LinkIcon className="h-3 w-3 text-purple-400" />}
                                {field.name}
                              </td>
                              <td className="py-1.5">
                                <code className="text-blue-400 bg-slate-800 px-1 py-0.5 rounded text-[10px]">
                                  {field.type}{field.isArray && '[]'}{field.isOptional && '?'}
                                </code>
                              </td>
                              <td className="py-1.5 text-slate-400">
                                <div className="flex flex-wrap gap-0.5">
                                  {field.isPrimaryKey && <span className="px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">PK</span>}
                                  {field.isUnique && <span className="px-1 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">UK</span>}
                                  {field.hasDefault && <span className="px-1 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">DEF</span>}
                                  {field.relation && <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">→{field.relation.model}</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Model Detail Panel */}
        {selectedModel && (
          <div className="w-64 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-medium text-white text-sm truncate">{selectedModel.name}</h3>
              <button onClick={() => setSelectedModel(null)} className="p-1 text-slate-400 hover:text-white">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* Fields */}
              <div>
                <h4 className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">
                  필드 ({selectedModel.fields.length})
                </h4>
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {selectedModel.fields.map(field => (
                    <div key={field.name} className="flex items-start gap-1.5 px-1.5 py-1 bg-slate-900 rounded text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {field.isPrimaryKey && <Key className="h-2.5 w-2.5 text-yellow-500" />}
                          <span className="text-white truncate">{field.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {field.type}{field.isArray && '[]'}{field.isOptional && '?'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indexes */}
              {selectedModel.indexes.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">
                    인덱스 ({selectedModel.indexes.length})
                  </h4>
                  <div className="space-y-0.5">
                    {selectedModel.indexes.map((idx, i) => (
                      <div key={i} className="px-1.5 py-1 bg-slate-900 rounded text-[10px] text-slate-300 font-mono truncate">
                        {idx}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relations */}
              {schema?.relations.filter(r => r.from === selectedModel.name).length > 0 && (
                <div>
                  <h4 className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">관계</h4>
                  <div className="space-y-0.5">
                    {schema.relations.filter(r => r.from === selectedModel.name).map((rel, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 bg-slate-900 rounded text-xs">
                        <LinkIcon className="h-2.5 w-2.5 text-purple-400" />
                        <span className="text-slate-300">{rel.fromField}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-blue-400">{rel.to}</span>
                        <span className="text-[10px] text-slate-500">({rel.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ERDViewer;

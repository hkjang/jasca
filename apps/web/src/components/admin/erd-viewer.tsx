'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Database,
  Search,
  ZoomIn,
  ZoomOut,
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
  Maximize,
  Minimize,
  Info,
  X,
  ArrowRight,
  Circle,
  Filter,
  BarChart3,
  FileText,
  FileCode,
  Image,
  PieChart,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  ParsedSchema,
  SchemaModel,
  parsePrismaSchema,
  generateMermaidERD,
  getSchemaStats,
  getDetailedSchemaStats,
  generateSQLDDL,
  generateMarkdownDocs,
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

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  '조직/프로젝트': 'bg-blue-500',
  '사용자/인증': 'bg-green-500',
  '스캔/취약점': 'bg-red-500',
  '정책/예외': 'bg-yellow-500',
  '워크플로우': 'bg-purple-500',
  '알림': 'bg-pink-500',
  '보고서': 'bg-cyan-500',
  '통합': 'bg-orange-500',
  '설정/기타': 'bg-slate-500',
  '기타': 'bg-slate-500',
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
  const [viewMode, setViewMode] = useState<'erd' | 'list' | 'stats'>('erd');
  const [zoom, setZoom] = useState(50);
  const [showFields, setShowFields] = useState(true);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(MODEL_CATEGORIES)));
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Advanced filtering state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set(Object.keys(MODEL_CATEGORIES)));
  const [relationTypeFilters, setRelationTypeFilters] = useState<Set<string>>(new Set(['1:1', '1:N', 'N:1', 'N:M']));
  const [showRelationsOnly, setShowRelationsOnly] = useState(false);
  
  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // List view sorting
  const [listSortBy, setListSortBy] = useState<'name' | 'fields' | 'relations'>('name');
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // Parse schema
  useEffect(() => {
    if (schemaContent) {
      const parsed = parsePrismaSchema(schemaContent);
      setSchema(parsed);
    }
  }, [schemaContent]);

  // Initialize mermaid
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'erd') return;
      
      // Don't trigger if in input
      if (document.activeElement?.tagName === 'INPUT') return;
      
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          setZoom(z => Math.min(z + 10, 200));
          break;
        case '-':
          e.preventDefault();
          setZoom(z => Math.max(z - 10, 10));
          break;
        case '0':
          e.preventDefault();
          setZoom(100);
          setPanOffset({ x: 0, y: 0 });
          break;
        case 'f':
          e.preventDefault();
          handleFitToScreen();
          break;
        case 'm':
          e.preventDefault();
          setShowMinimap(!showMinimap);
          break;
        case 'l':
          e.preventDefault();
          setShowLegend(!showLegend);
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            setIsFullscreen(false);
          }
          break;
        case 'F11':
          e.preventDefault();
          setIsFullscreen(!isFullscreen);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, showMinimap, showLegend, isFullscreen]);

  // Filter models based on search and category filters
  const filteredModels = useMemo(() => {
    if (!schema) return [];
    
    let result = schema.models;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        model =>
          model.name.toLowerCase().includes(query) ||
          model.fields.some(f => f.name.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    const assignedModelNames = new Set<string>();
    for (const [category, modelNames] of Object.entries(MODEL_CATEGORIES)) {
      if (categoryFilters.has(category)) {
        modelNames.forEach(name => assignedModelNames.add(name));
      }
    }
    if (categoryFilters.has('기타')) {
      // Include uncategorized models
      const allCategorized = new Set(Object.values(MODEL_CATEGORIES).flat());
      result.forEach(m => {
        if (!allCategorized.has(m.name)) assignedModelNames.add(m.name);
      });
    }
    result = result.filter(m => assignedModelNames.has(m.name) || categoryFilters.size === 0);
    
    // Apply relations only filter
    if (showRelationsOnly && schema) {
      const modelsWithRelations = new Set<string>();
      for (const rel of schema.relations) {
        modelsWithRelations.add(rel.from);
        modelsWithRelations.add(rel.to);
      }
      result = result.filter(m => modelsWithRelations.has(m.name));
    }
    
    return result;
  }, [schema, searchQuery, categoryFilters, showRelationsOnly]);

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
    
    for (const [category, modelNames] of Object.entries(MODEL_CATEGORIES)) {
      grouped[category] = filteredModels.filter(m => {
        if (modelNames.includes(m.name)) {
          assignedModels.add(m.name);
          return true;
        }
        return false;
      });
    }
    
    const uncategorized = filteredModels.filter(m => !assignedModels.has(m.name));
    if (uncategorized.length > 0) {
      grouped['기타'] = uncategorized;
    }
    
    return grouped;
  }, [filteredModels]);

  // Basic stats
  const stats = useMemo(() => {
    if (!schema) return null;
    return getSchemaStats(schema);
  }, [schema]);

  // Detailed stats for dashboard
  const detailedStats = useMemo(() => {
    if (!schema) return null;
    return getDetailedSchemaStats(schema);
  }, [schema]);

  // Sorted models for list view
  const sortedModels = useMemo(() => {
    const models = [...filteredModels];
    const getRelationCount = (m: SchemaModel) => 
      schema?.relations.filter(r => r.from === m.name).length || 0;
    
    models.sort((a, b) => {
      let cmp = 0;
      switch (listSortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'fields':
          cmp = a.fields.length - b.fields.length;
          break;
        case 'relations':
          cmp = getRelationCount(a) - getRelationCount(b);
          break;
      }
      return listSortDir === 'desc' ? -cmp : cmp;
    });
    return models;
  }, [filteredModels, listSortBy, listSortDir, schema]);

  // Toggle functions
  const toggleModel = useCallback((modelName: string) => {
    setExpandedModels(prev => {
      const next = new Set(prev);
      if (next.has(modelName)) next.delete(modelName);
      else next.add(modelName);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Zoom handlers
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
    
    const scaleX = (containerRect.width - 40) / (svgRect.width / (zoom / 100));
    const scaleY = (containerRect.height - 40) / (svgRect.height / (zoom / 100));
    const newZoom = Math.min(scaleX, scaleY) * 100;
    
    setZoom(Math.max(10, Math.min(200, Math.floor(newZoom))));
    setPanOffset({ x: 0, y: 0 });
  }, [zoom]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setZoom(z => Math.max(10, Math.min(200, z + delta)));
    }
  }, []);

  // Minimap click
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !minimapRef.current) return;
    
    const minimap = minimapRef.current;
    const rect = minimap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const scaleX = svgDimensions.width / rect.width;
    const scaleY = svgDimensions.height / rect.height;
    
    const newPanX = -(x * scaleX * (zoom / 100) - containerRect.width / 2);
    const newPanY = -(y * scaleY * (zoom / 100) - containerRect.height / 2);
    
    setPanOffset({ x: newPanX, y: newPanY });
  };

  // Minimap viewport
  const minimapViewport = useMemo(() => {
    if (!containerRef.current || svgDimensions.width === 0) return null;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const scaledWidth = svgDimensions.width * (zoom / 100);
    const scaledHeight = svgDimensions.height * (zoom / 100);
    
    const minimapWidth = 180;
    const minimapHeight = 110;
    
    const scaleX = minimapWidth / scaledWidth;
    const scaleY = minimapHeight / scaledHeight;
    
    return {
      width: Math.min(minimapWidth, containerRect.width * scaleX),
      height: Math.min(minimapHeight, containerRect.height * scaleY),
      left: Math.max(0, -panOffset.x * scaleX),
      top: Math.max(0, -panOffset.y * scaleY),
    };
  }, [zoom, panOffset, svgDimensions]);

  // Export functions
  const handleExportSVG = () => {
    if (!mermaidSvg) return;
    const blob = new Blob([mermaidSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema-erd.svg';
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportPNG = async () => {
    if (!mermaidSvg) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx?.scale(2, 2);
        ctx?.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'schema-erd.png';
        a.click();
      };
      
      const svgBlob = new Blob([mermaidSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    } catch (error) {
      console.error('PNG export failed:', error);
    }
    setShowExportMenu(false);
  };

  const handleExportSQL = (dialect: 'postgresql' | 'mysql') => {
    if (!schema) return;
    const sql = generateSQLDDL(schema, dialect);
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-${dialect}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    if (!schema) return;
    const md = generateMarkdownDocs(schema);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema-documentation.md';
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Legacy export for compatibility
  const handleExport = handleExportSVG;

  // Toggle category filter
  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Select all/none categories
  const selectAllCategories = () => setCategoryFilters(new Set([...Object.keys(MODEL_CATEGORIES), '기타']));
  const clearAllCategories = () => setCategoryFilters(new Set());

  // Zoom presets
  const zoomPresets = [25, 50, 75, 100, 125, 150, 200];

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

  // Main content component (used in both normal and fullscreen mode)
  const DiagramContent = () => (
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
          className="absolute bottom-3 right-3 w-[180px] h-[110px] bg-slate-900/95 border border-slate-600 rounded-lg overflow-hidden cursor-crosshair shadow-xl backdrop-blur-sm"
          onClick={handleMinimapClick}
        >
          <div
            className="w-full h-full opacity-40"
            style={{
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(mermaidSvg)}")`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
          {minimapViewport && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-400/20 rounded"
              style={{
                width: minimapViewport.width,
                height: minimapViewport.height,
                left: minimapViewport.left,
                top: minimapViewport.top,
              }}
            />
          )}
          <div className="absolute top-1 left-1.5 text-[10px] text-slate-300 font-medium">
            미니맵
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMinimap(false); }}
            className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute top-3 right-3 w-48 bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-white">관계 범례</h4>
            <button onClick={() => setShowLegend(false)} className="p-0.5 text-slate-400 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="flex items-center gap-1">
                <Circle className="h-2 w-2 fill-current" />
                <div className="w-4 h-[2px] bg-slate-400" />
                <Circle className="h-2 w-2 fill-current" />
              </div>
              <span>1:1 (일대일)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="flex items-center gap-1">
                <Circle className="h-2 w-2 fill-current" />
                <div className="w-4 h-[2px] bg-slate-400" />
                <div className="flex">
                  <Circle className="h-2 w-2" />
                  <Circle className="h-2 w-2 -ml-0.5" />
                </div>
              </div>
              <span>1:N (일대다)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <div className="flex items-center gap-1">
                <div className="flex">
                  <Circle className="h-2 w-2" />
                  <Circle className="h-2 w-2 -ml-0.5" />
                </div>
                <div className="w-4 h-[2px] bg-slate-400" />
                <div className="flex">
                  <Circle className="h-2 w-2" />
                  <Circle className="h-2 w-2 -ml-0.5" />
                </div>
              </div>
              <span>N:M (다대다)</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
            <div className="flex items-center gap-2 text-slate-300 text-[10px]">
              <span className="px-1 py-0.5 bg-yellow-500/30 text-yellow-400 rounded text-[9px]">PK</span>
              Primary Key
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-[10px]">
              <span className="px-1 py-0.5 bg-purple-500/30 text-purple-400 rounded text-[9px]">UK</span>
              Unique Key
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-[10px]">
              <span className="px-1 py-0.5 bg-blue-500/30 text-blue-400 rounded text-[9px]">FK</span>
              Foreign Key
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        {/* Status bar */}
        <div className="text-[10px] text-slate-400 bg-slate-900/90 px-2 py-1 rounded flex items-center gap-2 backdrop-blur-sm">
          <Move className="h-3 w-3" />
          드래그: 이동
          <span className="text-slate-600">|</span>
          Ctrl+휠: 확대
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">F: 맞춤 / M: 맵 / L: 범례</span>
        </div>
      </div>

      {/* Zoom slider */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-slate-700">
        <button onClick={handleZoomOut} className="p-1 text-slate-400 hover:text-white">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min="10"
          max="200"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <button onClick={handleZoomIn} className="p-1 text-slate-400 hover:text-white">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-slate-400 min-w-[40px] text-center">{zoom}%</span>
      </div>
    </>
  );

  return (
    <>
      {/* Fullscreen modal */}
      {isFullscreen && (
        <div 
          ref={fullscreenRef}
          className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col"
        >
          {/* Fullscreen header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-400" />
              <h2 className="text-white font-medium">스키마 ERD (전체화면)</h2>
              {stats && (
                <div className="flex gap-2 text-xs text-slate-400">
                  <span>{stats.modelCount} 모델</span>
                  <span>•</span>
                  <span>{stats.totalRelations} 관계</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={showFields}
                  onChange={e => setShowFields(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 h-3 w-3"
                />
                필드
              </label>
              <button
                onClick={() => setShowMinimap(!showMinimap)}
                className={`p-1.5 rounded ${showMinimap ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <Map className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowLegend(!showLegend)}
                className={`p-1.5 rounded ${showLegend ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <Info className="h-4 w-4" />
              </button>
              <button
                onClick={handleFitToScreen}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="화면에 맞추기 (F)"
              >
                <Focus className="h-4 w-4" />
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                SVG
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
              >
                <Minimize className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Fullscreen content */}
          <div className="flex-1 relative">
            <DiagramContent />
          </div>
        </div>
      )}

      {/* Normal view */}
      <div className={`flex flex-col h-full ${isFullscreen ? 'invisible' : ''}`}>
        {/* Stats - Compact */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
            {[
              { icon: Database, label: '모델', value: stats.modelCount, color: 'text-blue-400' },
              { icon: Layers, label: 'Enum', value: stats.enumCount, color: 'text-green-400' },
              { icon: Hash, label: '필드', value: stats.totalFields, color: 'text-yellow-400' },
              { icon: LinkIcon, label: '관계', value: stats.totalRelations, color: 'text-purple-400' },
              { icon: Key, label: '인덱스', value: stats.totalIndexes, color: 'text-red-400' },
              { icon: Hash, label: '평균', value: stats.avgFieldsPerModel, color: 'text-cyan-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <stat.icon className={`h-3 w-3 ${stat.color}`} />
                  {stat.label}
                </div>
                <div className="text-lg font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
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

          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
            {[
              { mode: 'erd' as const, icon: Grid3X3, label: 'ERD' },
              { mode: 'list' as const, icon: List, label: '목록' },
              { mode: 'stats' as const, icon: BarChart3, label: '통계' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                  viewMode === mode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
              showFilterPanel 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            필터
            {categoryFilters.size < Object.keys(MODEL_CATEGORIES).length + 1 && (
              <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-[10px]">
                {categoryFilters.size}
              </span>
            )}
          </button>

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

              <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                <button onClick={handleZoomOut} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <select
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="bg-slate-700 text-white text-xs px-1 py-0.5 rounded border-0 focus:ring-1 focus:ring-blue-500 w-14"
                >
                  {zoomPresets.map(z => <option key={z} value={z}>{z}%</option>)}
                  {!zoomPresets.includes(zoom) && <option value={zoom}>{zoom}%</option>}
                </select>
                <button onClick={handleZoomIn} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                <button onClick={handleFitToScreen} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="화면에 맞추기 (F)">
                  <Focus className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleZoomReset} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="초기화 (0)">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowMinimap(!showMinimap)}
                  className={`p-1 rounded ${showMinimap ? 'text-blue-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  title="미니맵 (M)"
                >
                  <Map className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowLegend(!showLegend)}
                  className={`p-1 rounded ${showLegend ? 'text-blue-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  title="범례 (L)"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded border border-slate-700"
                title="전체화면 (F11)"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>

              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  내보내기
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                      <button onClick={handleExportSVG} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
                        <FileCode className="h-3.5 w-3.5" />
                        SVG 다이어그램
                      </button>
                      <button onClick={handleExportPNG} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
                        <Image className="h-3.5 w-3.5" />
                        PNG 이미지
                      </button>
                      <div className="border-t border-slate-700 my-1" />
                      <button onClick={() => handleExportSQL('postgresql')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
                        <Database className="h-3.5 w-3.5" />
                        PostgreSQL DDL
                      </button>
                      <button onClick={() => handleExportSQL('mysql')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
                        <Database className="h-3.5 w-3.5" />
                        MySQL DDL
                      </button>
                      <div className="border-t border-slate-700 my-1" />
                      <button onClick={handleExportMarkdown} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
                        <FileText className="h-3.5 w-3.5" />
                        Markdown 문서
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Filter Panel - Collapsible */}
          {showFilterPanel && (
            <div className="w-48 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-medium text-white text-sm">필터</h3>
                <button onClick={() => setShowFilterPanel(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {/* Category filters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-slate-400">카테고리</h4>
                    <div className="flex gap-1">
                      <button onClick={selectAllCategories} className="text-[10px] text-blue-400 hover:text-blue-300">전체</button>
                      <span className="text-slate-600">/</span>
                      <button onClick={clearAllCategories} className="text-[10px] text-blue-400 hover:text-blue-300">없음</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {[...Object.keys(MODEL_CATEGORIES), '기타'].map(category => (
                      <label key={category} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={categoryFilters.has(category)}
                          onChange={() => toggleCategoryFilter(category)}
                          className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 h-3 w-3"
                        />
                        <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[category] || 'bg-slate-500'}`} />
                        {category}
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Relations only filter */}
                <div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRelationsOnly}
                      onChange={e => setShowRelationsOnly(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 h-3 w-3"
                    />
                    관계있는 모델만
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700">
              <h3 className="font-medium text-white text-sm">모델 ({filteredModels.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {Object.entries(modelsByCategory).map(([category, models]) => {
                if (models.length === 0) return null;
                const colorClass = CATEGORY_COLORS[category] || 'bg-slate-500';
                return (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                      {expandedCategories.has(category) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {category}
                      <span className="ml-auto text-slate-500 text-[10px]">{models.length}</span>
                    </button>
                    {expandedCategories.has(category) && (
                      <div className="ml-2 space-y-0.5">
                        {models.map(model => (
                          <button
                            key={model.name}
                            onClick={() => { setSelectedModel(model); toggleModel(model.name); }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left transition-colors ${
                              selectedModel?.name === model.name ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <Database className="h-3 w-3 flex-shrink-0 text-blue-400" />
                            <span className="truncate flex-1">{model.name}</span>
                            <span className="text-[10px] text-slate-500">{model.fields.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Enums */}
            <div className="border-t border-slate-700">
              <button
                onClick={() => toggleCategory('__enums__')}
                className="w-full p-2 flex items-center justify-between text-sm font-medium text-white hover:bg-slate-700/50"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-green-400" />
                  Enum ({filteredEnums.length})
                </div>
                {expandedCategories.has('__enums__') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedCategories.has('__enums__') && (
                <div className="max-h-32 overflow-y-auto p-1.5 space-y-0.5">
                  {filteredEnums.map(enumDef => (
                    <div key={enumDef.name} className="px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 rounded cursor-pointer" title={enumDef.values.join(', ')}>
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

          {/* Main Content */}
          <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden relative">
            {viewMode === 'erd' ? (
              <DiagramContent />
            ) : viewMode === 'stats' ? (
              /* Statistics Dashboard */
              <div className="h-full overflow-auto p-4">
                {detailedStats && (
                  <div className="space-y-4">
                    {/* Category Distribution */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-blue-400" />
                        카테고리별 모델 분포
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(detailedStats.categoryDistribution).map(([cat, count]) => (
                          <div key={cat} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                            <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[cat] || 'bg-slate-500'}`} />
                            <span className="text-xs text-slate-300 flex-1">{cat}</span>
                            <span className="text-sm font-bold text-white">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Models */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-yellow-400" />
                          필드 수 TOP 5
                        </h3>
                        <div className="space-y-2">
                          {detailedStats.topModelsByFields.map((m, i) => (
                            <div key={m.name} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-4">{i + 1}.</span>
                              <span className="text-xs text-slate-300 flex-1 truncate">{m.name}</span>
                              <div className="flex-1 max-w-20">
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-yellow-500 rounded-full" 
                                    style={{ width: `${(m.count / detailedStats.topModelsByFields[0].count) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-white w-8 text-right">{m.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-purple-400" />
                          관계 수 TOP 5
                        </h3>
                        <div className="space-y-2">
                          {detailedStats.topModelsByRelations.map((m, i) => (
                            <div key={m.name} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-4">{i + 1}.</span>
                              <span className="text-xs text-slate-300 flex-1 truncate">{m.name}</span>
                              <div className="flex-1 max-w-20">
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full" 
                                    style={{ width: `${(m.count / (detailedStats.topModelsByRelations[0]?.count || 1)) * 100}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-white w-8 text-right">{m.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Relation Types & Field Types */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-cyan-400" />
                          관계 유형 분포
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(detailedStats.relationTypeDistribution).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                              <span className="text-xs text-slate-300">{type}</span>
                              <span className="text-sm font-bold text-white">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          <Type className="h-4 w-4 text-green-400" />
                          필드 타입 분포 (TOP 8)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(detailedStats.fieldTypeDistribution)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([type, count]) => (
                              <div key={type} className="px-2 py-1 bg-slate-800 rounded text-xs">
                                <span className="text-blue-400">{type}</span>
                                <span className="text-slate-400 ml-1">({count})</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Warning stats */}
                    {detailedStats.cascadeDeleteCount > 0 && (
                      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Cascade Delete 관계: {detailedStats.cascadeDeleteCount}개</span>
                        </div>
                        <p className="text-xs text-amber-300/70 mt-1">
                          상위 레코드 삭제 시 하위 레코드가 함께 삭제됩니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <div className="p-3 space-y-3">
                  {filteredModels.map(model => (
                    <div key={model.name} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700">
                        <Database className="h-4 w-4 text-blue-400" />
                        <h3 className="font-medium text-white text-sm">{model.name}</h3>
                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-700 rounded">{model.fields.length}</span>
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
                                <td className="py-1.5">
                                  <div className="flex flex-wrap gap-0.5">
                                    {field.isPrimaryKey && <span className="px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">PK</span>}
                                    {field.isUnique && <span className="px-1 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">UK</span>}
                                    {field.hasDefault && <span className="px-1 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">DEF</span>}
                                    {field.relation && <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] flex items-center gap-0.5"><ArrowRight className="h-2 w-2" />{field.relation.model}</span>}
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

          {/* Detail Panel */}
          {selectedModel && (
            <div className="w-64 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-medium text-white text-sm truncate">{selectedModel.name}</h3>
                <button onClick={() => setSelectedModel(null)} className="p-1 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                <div>
                  <h4 className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">필드 ({selectedModel.fields.length})</h4>
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {selectedModel.fields.map(field => (
                      <div key={field.name} className="flex items-start gap-1.5 px-1.5 py-1 bg-slate-900 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {field.isPrimaryKey && <Key className="h-2.5 w-2.5 text-yellow-500" />}
                            {field.relation && !field.isPrimaryKey && <LinkIcon className="h-2.5 w-2.5 text-purple-400" />}
                            <span className="text-white truncate">{field.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{field.type}{field.isArray && '[]'}{field.isOptional && '?'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedModel.indexes.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">인덱스 ({selectedModel.indexes.length})</h4>
                    <div className="space-y-0.5">
                      {selectedModel.indexes.map((idx, i) => (
                        <div key={i} className="px-1.5 py-1 bg-slate-900 rounded text-[10px] text-slate-300 font-mono truncate">{idx}</div>
                      ))}
                    </div>
                  </div>
                )}
                {schema?.relations.filter(r => r.from === selectedModel.name).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">관계</h4>
                    <div className="space-y-0.5">
                      {schema.relations.filter(r => r.from === selectedModel.name).map((rel, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 bg-slate-900 rounded text-xs">
                          <LinkIcon className="h-2.5 w-2.5 text-purple-400" />
                          <span className="text-slate-300">{rel.fromField}</span>
                          <ArrowRight className="h-2.5 w-2.5 text-slate-500" />
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
    </>
  );
}

export default ERDViewer;

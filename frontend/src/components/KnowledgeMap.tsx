import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as echarts from 'echarts';
import { KnowledgeNode, KnowledgeEdge, Subject } from '../lib/api';

interface KnowledgeMapProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  loading?: boolean;
  onNodeClick?: (node: KnowledgeNode) => void;
}

const SUBJECT_COLORS: Record<Subject, string> = {
  physics: '#3B82F6',
  chemistry: '#22C55E',
  biology: '#F97316',
  math: '#EF4444',
  history: '#8B5CF6',
  other: '#6B7280'
};

export default function KnowledgeMap({ nodes, edges, loading, onNodeClick }: KnowledgeMapProps) {
  const { t } = useTranslation('learning');
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading || nodes.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chartNodes = nodes.map(node => ({
      id: node.id,
      name: node.name,
      value: node.reviewCount,
      symbolSize: node.size || 30 + node.reviewCount * 3,
      x: node.x,
      y: node.y,
      itemStyle: {
        color: SUBJECT_COLORS[node.subject],
        shadowBlur: 20,
        shadowColor: SUBJECT_COLORS[node.subject]
      },
      label: {
        show: true,
        position: 'bottom' as const,
        formatter: '{b}',
        fontSize: 12,
        color: '#d6d3d1'
      },
      emphasis: {
        scale: 1.5,
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold' as const
        }
      },
      // Store original node data for click handler
      _originalNode: node
    }));

    const chartEdges = edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      lineStyle: {
        width: edge.strength * 5,
        curveness: 0.2,
        opacity: 0.6
      }
    }));

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: 'rgba(28, 25, 23, 0.95)',
        borderColor: '#44403c',
        borderWidth: 1,
        textStyle: {
          color: '#d6d3d1'
        },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const node = params.data._originalNode as KnowledgeNode;
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #fff;">
                  ${node.name}
                </div>
                <div style="color: #a8a29e; font-size: 12px;">
                  ${t('knowledgeMap.tooltip.subject')}: ${t(`knowledgeMap.legend.${node.subject}`)}
                </div>
                <div style="color: #a8a29e; font-size: 12px;">
                  ${t('knowledgeMap.tooltip.reviewCount', { count: node.reviewCount })}
                </div>
              </div>
            `;
          }
          return '';
        }
      },
      series: [
        {
          type: 'graph' as const,
          layout: 'force' as const,
          data: chartNodes,
          links: chartEdges,
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          force: {
            repulsion: 400,
            gravity: 0.1,
            edgeLength: 150,
            layoutAnimation: true
          },
          lineStyle: {
            color: '#57534e',
            curveness: 0.2
          },
          emphasis: {
            focus: 'adjacency' as const,
            lineStyle: {
              width: 5,
              opacity: 1
            }
          }
        }
      ]
    };

    chartInstance.current.setOption(option);

    chartInstance.current.on('click', (params: any) => {
      if (params.dataType === 'node') {
        const node = params.data._originalNode as KnowledgeNode;
        setSelectedNode(node);
        onNodeClick?.(node);
      }
    });

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes, edges, loading, t, onNodeClick]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  const subjects: Subject[] = ['physics', 'chemistry', 'biology', 'math', 'history', 'other'];

  if (loading) {
    return (
      <div className="bg-stone-900/50 backdrop-blur-xl border border-stone-800 rounded-2xl p-6">
        <div className="h-[500px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-900/50 backdrop-blur-xl border border-stone-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{t('knowledgeMap.title')}</h2>
          <p className="text-stone-400 text-sm mt-1">{t('knowledgeMap.subtitle')}</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {subjects.map(subject => (
            <div key={subject} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SUBJECT_COLORS[subject] }}
              />
              <span className="text-xs text-stone-400">
                {t(`knowledgeMap.legend.${subject}`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={chartRef}
        className="w-full h-[500px] rounded-xl overflow-hidden"
        style={{ background: 'transparent' }}
      />

      {selectedNode && (
        <div className="mt-4 p-4 bg-stone-800/50 rounded-xl border border-stone-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{selectedNode.name}</h3>
              <p className="text-sm text-stone-400">
                {t(`knowledgeMap.legend.${selectedNode.subject}`)} •{' '}
                {t('knowledgeMap.tooltip.reviewCount', { count: selectedNode.reviewCount })}
              </p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-stone-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span>Click nodes to view details</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span>Drag to pan, scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}

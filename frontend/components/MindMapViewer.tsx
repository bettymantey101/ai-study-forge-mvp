import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ParsedSection } from '../context/StudyPackContext';

interface MindMapViewerProps {
  sections: ParsedSection[];
}

export default function MindMapViewer({ sections }: MindMapViewerProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    if (sections.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create root node
    const rootSection = sections[0];
    nodes.push({
      id: 'root',
      type: 'default',
      position: { x: 0, y: 0 },
      data: { 
        label: rootSection.title,
      },
      style: {
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        border: '2px solid hsl(var(--primary))',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '14px',
        fontWeight: 'bold',
        minWidth: '150px',
        textAlign: 'center',
      },
    });

    // Create nodes for other sections
    sections.slice(1).forEach((section, index) => {
      const angle = (index * 2 * Math.PI) / (sections.length - 1);
      const radius = 200 + (section.level - 1) * 100;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const nodeId = `section-${index + 1}`;
      
      nodes.push({
        id: nodeId,
        type: 'default',
        position: { x, y },
        data: { 
          label: section.title,
        },
        style: {
          background: section.level === 1 
            ? 'hsl(var(--secondary))' 
            : 'hsl(var(--muted))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px',
          padding: '8px',
          fontSize: '12px',
          minWidth: '120px',
          textAlign: 'center',
        },
      });

      // Connect to root or parent based on level
      const sourceId = section.level === 1 ? 'root' : `section-${Math.max(1, index)}`;
      
      edges.push({
        id: `edge-${nodeId}`,
        source: sourceId,
        target: nodeId,
        type: 'smoothstep',
        style: {
          stroke: 'hsl(var(--border))',
          strokeWidth: 2,
        },
        animated: false,
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [sections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Sections Available
            </h3>
            <p className="text-muted-foreground">
              This study pack doesn't contain structured sections for mind mapping.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Mind Map</h2>
        <p className="text-muted-foreground">
          Visual representation of your study material structure
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div style={{ width: '100%', height: '600px' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{
                padding: 0.2,
                minZoom: 0.5,
                maxZoom: 1.5,
              }}
            >
              <Controls />
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1}
                color="hsl(var(--muted-foreground))"
              />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {section.content.substring(0, 150)}
                {section.content.length > 150 ? '...' : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

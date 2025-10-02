import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Settings, 
  Building, 
  Zap, 
  ChevronDown, 
  ChevronRight,
  Monitor,
  Database,
  Star,
  Info
} from 'lucide-react';

interface MeterNode {
  id: string;
  name: string;
  type: 'building' | 'floor' | 'meter' | 'sensor';
  children?: MeterNode[];
  status?: 'online' | 'offline' | 'warning';
  favorite?: boolean;
}

const meterConfig: MeterNode[] = [
  {
    id: 'webmeter',
    name: 'Webmeter',
    type: 'building',
    children: [
      {
        id: 'amplicon',
        name: 'Amplicon',
        type: 'building',
        children: [
          {
            id: 'opc250',
            name: 'OPC+250',
            type: 'sensor',
            children: [
              { id: 'floor1', name: 'Floor 1', type: 'floor', status: 'online' },
              { id: 'floor2', name: 'Floor 2', type: 'floor', status: 'online' },
              { id: 'floor3', name: 'Floor 3', type: 'floor', status: 'online' },
              { id: 'floor4', name: 'Floor 4', type: 'floor', status: 'warning' },
              { id: 'air1', name: 'AIR1_2.04kW', type: 'meter', status: 'online' },
              { id: 'air2', name: 'AIR2_2.04kW', type: 'meter', status: 'online' },
              { id: 'air3', name: 'AIR3_1.47kW', type: 'meter', status: 'online' },
              { id: 'air4', name: 'AIR4_1.47kW', type: 'meter', status: 'offline' },
              { id: 'elevator', name: 'Elevator', type: 'meter', status: 'online' },
              { id: 'total', name: 'Total Office', type: 'meter', status: 'online' }
            ]
          }
        ]
      },
      {
        id: 'temp_humidity',
        name: 'Temperature and Relative humidity',
        type: 'sensor'
      },
      {
        id: 'cogent249',
        name: 'cogENT.249',
        type: 'sensor',
        children: [
          { id: 'meter1_port1', name: 'Meter1-Port1', type: 'meter', status: 'online' },
          { id: 'meter1_port2', name: 'Meter1-Port2', type: 'meter', status: 'online' },
          { id: 'meter1_port3', name: 'Meter1-Port3', type: 'meter', status: 'online' }
        ]
      }
    ]
  }
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'building':
      return <Building className="w-4 h-4" />;
    case 'floor':
      return <Building className="w-4 h-4" />;
    case 'meter':
      return <Zap className="w-4 h-4" />;
    case 'sensor':
      return <Monitor className="w-4 h-4" />;
    default:
      return <Database className="w-4 h-4" />;
  }
};

const getStatusBadge = (status?: string) => {
  if (!status) return null;
  
  const variants = {
    online: 'bg-success text-success-foreground',
    offline: 'bg-destructive text-destructive-foreground',
    warning: 'bg-warning text-warning-foreground'
  };

  return (
    <Badge className={variants[status as keyof typeof variants] || 'bg-muted'}>
      {status.toUpperCase()}
    </Badge>
  );
};

function MeterTreeNode({ node, level = 0 }: { node: MeterNode; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-1">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div 
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasChildren && (
              <>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </>
            )}
            {!hasChildren && <div className="w-4" />}
            
            {getTypeIcon(node.type)}
            
            <span className="font-medium text-foreground flex-1">{node.name}</span>
            
            {node.favorite && <Star className="w-4 h-4 text-warning fill-current" />}
            {getStatusBadge(node.status)}
          </div>
        </CollapsibleTrigger>
        
        {hasChildren && (
          <CollapsibleContent className="space-y-1">
            {node.children?.map((child) => (
              <MeterTreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export default function Config() {
  const [selectedTree, setSelectedTree] = useState('physical');

  return (
    <PageLayout>
      <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meter Config</h1>
          <p className="text-muted-foreground">Configure and manage meter hierarchy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Physical Meter Tree */}
        <Card className="shadow-card">
          <CardHeader className="bg-gradient-primary text-primary-foreground">
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Physical Meter Tree</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-80">
              {meterConfig.map((node) => (
                <MeterTreeNode key={node.id} node={node} />
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Historical Meter Tree */}
        <Card className="shadow-card">
          <CardHeader className="bg-gradient-primary text-primary-foreground">
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Historical Meter Tree</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-80">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30">
                  <Building className="w-4 h-4 text-primary" />
                  <span className="font-medium">Webmeter</span>
                </div>
                <div className="ml-6 space-y-1">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-destructive rounded-full"></span>
                      <span className="text-sm">MSB ROOM 1</span>
                    </div>
                  </div>
                  <div className="ml-4 space-y-1">
                    <div className="flex items-center space-x-2 p-1">
                      <span className="w-3 h-3 bg-primary rounded-full"></span>
                      <span className="text-sm">MSB-EW-1 C/W MSB-WW-2</span>
                    </div>
                    {['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'].map((floor) => (
                      <div key={floor} className="ml-6 flex items-center space-x-2 p-1">
                        <span className="w-2 h-2 bg-success rounded-full"></span>
                        <span className="text-xs">{floor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Online Meter Tree */}
        <Card className="shadow-card">
          <CardHeader className="bg-gradient-primary text-primary-foreground">
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>Online Meter Tree</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-80">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30">
                  <Building className="w-4 h-4 text-primary" />
                  <span className="font-medium">Webmeter</span>
                </div>
                <div className="ml-6 space-y-1">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 bg-destructive rounded-full"></span>
                      <span className="text-sm">MSB ROOM 1</span>
                    </div>
                  </div>
                  <div className="ml-4 space-y-1">
                    <div className="flex items-center space-x-2 p-1">
                      <span className="w-3 h-3 bg-primary rounded-full"></span>
                      <span className="text-sm">MSB-EW-1 C/W MSB-WW-2</span>
                    </div>
                    {['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'].map((floor) => (
                      <div key={floor} className="ml-6 flex items-center space-x-2 p-1">
                        <span className="w-2 h-2 bg-success rounded-full"></span>
                        <span className="text-xs">{floor}</span>
                      </div>
                    ))}
                    <div className="ml-6 space-y-1">
                      <div className="flex items-center space-x-2 p-1">
                        <span className="w-2 h-2 bg-warning rounded-full"></span>
                        <span className="text-xs">AIR1_2.04kW</span>
                      </div>
                      <div className="flex items-center space-x-2 p-1">
                        <span className="w-2 h-2 bg-warning rounded-full"></span>
                        <span className="text-xs">AIR2_2.04kW</span>
                      </div>
                      <div className="flex items-center space-x-2 p-1">
                        <span className="w-2 h-2 bg-warning rounded-full"></span>
                        <span className="text-xs">AIR3_1.47kW</span>
                      </div>
                      <div className="flex items-center space-x-2 p-1">
                        <span className="w-2 h-2 bg-warning rounded-full"></span>
                        <span className="text-xs">AIR4_1.47kW</span>
                      </div>
                    </div>
                    <div className="ml-4 space-y-1">
                      <div className="flex items-center space-x-2 p-1">
                        <span className="w-3 h-3 bg-info rounded-full"></span>
                        <span className="text-sm">MSB-WW-1A C/W MSB-WW-1B</span>
                      </div>
                      <div className="ml-6 space-y-1">
                        <div className="flex items-center space-x-2 p-1">
                          <span className="w-2 h-2 bg-destructive rounded-full"></span>
                          <span className="text-xs">ESSB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5" />
            <span>Legend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-destructive rounded-full"></span>
              <span className="text-sm">1st Level - Location of Switchboards</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-primary rounded-full"></span>
              <span className="text-sm">2nd Level - Name of Switchboards + Display of all individual DPMs</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-warning rounded-full"></span>
              <span className="text-sm">3rd Level - Location of Switchboards</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-info rounded-full"></span>
              <span className="text-sm">4th Level - Name of Switchboards + Display of individual DPMs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favorites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-warning" />
              <span>Historical Favorite Meter</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Floor 1</span>
                <Button size="sm" variant="destructive">Del.</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Floor 2</span>
                <Button size="sm" variant="destructive">Del.</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-warning" />
              <span>Online Favorite Meter</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Floor 1</span>
                <Button size="sm" variant="destructive">Del.</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Floor 2</span>
                <Button size="sm" variant="destructive">Del.</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Floor 3</span>
                <Button size="sm" variant="destructive">Del.</Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Floor 4</span>
                <Button size="sm" variant="destructive">Del.</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </PageLayout>
  );
}
import React, { useState, useEffect, useMemo } from 'react';
import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { AppService, AppState } from '../services/AppService';
import { Project, Branch } from '../core/types';

export function App({ service }: { service: AppService }) {
  const [state, setState] = useState<AppState>(service.getState());
  const { width, height } = useTerminalDimensions();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    service.refreshAllThrottled();
  }, [service]);

  // Listen for state updates from the service
  useEffect(() => {
    return service.subscribe((newState: AppState) => {
      setState(newState);
    });
  }, [service]);

  const allItems = useMemo(() => {
    const items: { type: 'project' | 'branch'; data: any; projectId: string }[] = [];
    state.cfg.projects.forEach((p) => {
      items.push({ type: 'project', data: p, projectId: p.id });
      p.branches.forEach((b) => {
        items.push({ type: 'branch', data: b, projectId: p.id });
      });
    });
    return items;
  }, [state.cfg.projects]);

  useKeyboard((event) => {
    if (event.name === 'q' || (event.name === 'c' && event.ctrl)) {
      service.quit();
    }
    if (event.name === 'up') {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }
    if (event.name === 'down') {
      setSelectedIndex((prev) => Math.min(allItems.length - 1, prev + 1));
    }
    if (event.name === 'r') {
      service.refreshAll(true);
    }
    if (event.name === 'o') {
      const item = allItems[selectedIndex];
      if (item) {
        service.openPath(item.data.path || item.data.root);
      }
    }
    if (event.name === 't') {
      const item = allItems[selectedIndex];
      if (item) {
        service.openInTerminal(item.data.path || item.data.root);
      }
    }
  });

  return (
    <box flexDirection="column" style={{ width, height, padding: 1 }}>
      <box style={{ marginBottom: 1 }}>
        <text>
          <span fg="cyan" bold>Tree Buddy CLI</span>
          <span fg="gray"> | q: quit | r: refresh | o: open | t: terminal | ↑/↓: navigate</span>
        </text>
      </box>

      <scrollbox flexGrow={1} border title="Projects" focused>
        {allItems.map((item, i) => {
          const isSelected = i === selectedIndex;
          if (item.type === 'project') {
            const p = item.data as Project;
            return (
              <box key={p.id} style={{ paddingLeft: 1, backgroundColor: isSelected ? '#333' : undefined }}>
                <text bold fg="yellow">{p.name}</text>
              </box>
            );
          } else {
            const b = item.data as Branch;
            const statusColor = b.status.behind > 0 ? 'red' : b.status.dirty ? 'yellow' : 'green';
            return (
              <box key={`${item.projectId}-${b.name}`} style={{ paddingLeft: 3, backgroundColor: isSelected ? '#333' : undefined }}>
                <text>
                  <span fg={statusColor}>● </span>
                  <span fg={isSelected ? 'white' : 'gray'}>{b.name}</span>
                  {b.locked && <span fg="red"> 🔒</span>}
                  {b.merged && <span fg="blue"> (merged)</span>}
                </text>
              </box>
            );
          }
        })}
      </scrollbox>

      {state.isRefreshing && (
        <box style={{ marginTop: 1 }}>
          <text fg="cyan">Refreshing...</text>
        </box>
      )}
    </box>
  );
}

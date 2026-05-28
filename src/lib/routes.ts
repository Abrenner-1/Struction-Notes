export const PROJECT_TAB_IDS = [
  'dashboard',
  'canvas',
  'tasks',
  'notes',
  'procurement',
  'registers',
  'meetings',
] as const;

export type ProjectTab = typeof PROJECT_TAB_IDS[number];

export type AppRoute =
  | { view: 'dashboard' }
  | { view: 'project'; projectId: string; tab: ProjectTab };

const TAB_TO_PATH_SEGMENT: Record<ProjectTab, string> = {
  dashboard: 'dashboard',
  canvas: 'notes',
  tasks: 'tasks',
  notes: 'documentation',
  procurement: 'procurement',
  registers: 'registers',
  meetings: 'meetings',
};

const PATH_SEGMENT_TO_TAB = Object.entries(TAB_TO_PATH_SEGMENT).reduce<Record<string, ProjectTab>>(
  (segments, [tab, segment]) => {
    segments[segment] = tab as ProjectTab;
    return segments;
  },
  {},
);

export function parseAppRoute(pathname = window.location.pathname): AppRoute {
  const [baseSegment, projectId, tabSegment] = pathname.split('/').filter(Boolean);

  if (baseSegment !== 'projects' || !projectId) {
    return { view: 'dashboard' };
  }

  return {
    view: 'project',
    projectId: decodeURIComponent(projectId),
    tab: PATH_SEGMENT_TO_TAB[tabSegment || 'dashboard'] || 'dashboard',
  };
}

export function getDashboardPath() {
  return '/projects';
}

export function getProjectPath(projectId: string, tab: ProjectTab = 'dashboard') {
  return `/projects/${encodeURIComponent(projectId)}/${TAB_TO_PATH_SEGMENT[tab]}`;
}

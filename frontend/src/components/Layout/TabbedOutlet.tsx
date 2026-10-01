import React, { useEffect, useMemo } from 'react';
import { useLocation, matchPath, Routes, Route } from 'react-router-dom';
import { useTabStore } from '../../store/tabStore';
import { APP_ROUTES } from '../../routes/config';

const TabbedOutlet = () => {
  const location = useLocation();
  const { tabs, activeTabId, addTab, setActiveTab } = useTabStore();

  useEffect(() => {
    // Find matching route in config
    const route = APP_ROUTES.find((r) => 
      matchPath({ path: r.path, end: true }, location.pathname)
    );

    if (route) {
      // For titles with params, we might want to customize later.
      // For now, use the static title.
      addTab({
        id: location.pathname, // Use full path as ID to allow multiple instances (e.g. edit/1, edit/2)
        title: route.title,
        path: location.pathname,
      });
      setActiveTab(location.pathname);
    }
  }, [location.pathname, addTab, setActiveTab]);

  return (
    <div className="relative w-full h-full">
      {tabs.map((tab) => {
        // We need to find the component for this tab.
        // The tab.id is the path. We match it against APP_ROUTES.
        const routeConfig = APP_ROUTES.find((r) => 
          matchPath({ path: r.path, end: true }, tab.path)
        );
        
        if (!routeConfig) return null;
        
        const Component = routeConfig.component;
        const isActive = activeTabId === tab.id;

        return (
          <div
            key={tab.id}
            className={`w-full h-full overflow-y-auto custom-scrollbar`}
            style={{ display: isActive ? 'block' : 'none' }}
          >
            <Routes location={tab.path}>
              <Route path={routeConfig.path} element={<Component />} />
            </Routes>
          </div>
        );
      })}
      {tabs.length === 0 && (
        <div className="flex items-center justify-center h-full text-slate-400 italic">
          No open tabs. Select a module from the sidebar.
        </div>
      )}
    </div>
  );
};

export default TabbedOutlet;

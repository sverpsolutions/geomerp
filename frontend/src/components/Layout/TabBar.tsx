import React from 'react';
import { useTabStore } from '../../store/tabStore';
import { useNavigate } from 'react-router-dom';
import { audit_api } from '../../api/audit';

const TabBar = () => {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabStore();
  const navigate = useNavigate();

  const handleTabClick = (id: string, path: string) => {
    setActiveTab(id);
    navigate(path);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const tabToClose = tabs.find(t => t.id === id);
    if (tabToClose) {
        audit_api.log({
            action: 'CLOSE',
            module: tabToClose.title,
            details: `Closed tab: ${tabToClose.title}`
        });
    }
    removeTab(id);
    
    // Logic to handle navigation after closing
    setTimeout(() => {
      const currentTabs = useTabStore.getState().tabs;
      const currentActiveId = useTabStore.getState().activeTabId;
      if (currentActiveId) {
          const activeTab = currentTabs.find(t => t.id === currentActiveId);
          if (activeTab) navigate(activeTab.path);
      } else {
          navigate('/dashboard');
      }
    }, 0);
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center bg-white border-b border-border px-2 overflow-x-auto no-scrollbar h-[38px] shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id, tab.path)}
            className={`group flex items-center h-full gap-2 px-4 cursor-pointer transition-all border-r border-border min-w-[120px] max-w-[200px] relative ${
              isActive 
                ? 'bg-primary-light text-primary border-b-2 border-b-primary' 
                : 'text-text-secondary hover:bg-bg-app'
            }`}
          >
            <span className="text-[11px] font-bold uppercase truncate flex-1">
              {tab.title}
            </span>
            
            <button
              onClick={(e) => handleClose(e, tab.id)}
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                isActive ? 'text-primary hover:bg-primary hover:text-white' : 'text-text-muted hover:bg-border opacity-0 group-hover:opacity-100'
              }`}
            >
              <i className="fas fa-times text-[9px]"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default TabBar;

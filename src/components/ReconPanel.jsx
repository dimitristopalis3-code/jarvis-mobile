import React, { useState } from 'react';
import { useJarvis } from '../context/JarvisContext';

const ReconPanel = () => {
  const { leadsLog, addLead, updateLeadStatus, deleteLead, setActiveMode, playSound, speak } = useJarvis();
  const [newLead, setNewLead] = useState({ name: '', location: '', type: 'Factory' });

  // AUTO-SEARCH FUNCTIONS (Opens Google Maps App)
  const launchSearch = (query) => {
    playSound('click');
    speak(`Initiating reconnaissance for ${query}.`);
    window.open(`https://www.google.com/maps/search/${query}+near+me`, '_blank');
  };

  const handleAdd = () => {
    if (!newLead.name) return;
    addLead(newLead);
    setNewLead({ name: '', location: '', type: 'Factory' });
  };

  const getStatusColor = (status) => {
    if(status === 'Potential') return 'text-gray-400 border-gray-500';
    if(status === 'Contacted') return 'text-orange-400 border-orange-500';
    if(status === 'Contracted') return 'text-green-400 border-green-500';
    return 'text-red-400 border-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-slide-up">
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-cyan/30">
        <div className="flex items-center gap-3">
            <i className="fas fa-satellite-dish text-cyan text-xl animate-pulse"></i>
            <h2 className="text-cyan font-orbitron text-xl tracking-widest">RECON / SALES</h2>
        </div>
        <button onClick={() => { playSound('click'); setActiveMode("HOME"); }} className="text-cyan hover:text-white">
          <i className="fas fa-times text-2xl"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        
        {/* QUICK SEARCH TOOLS */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => launchSearch('Factories')} className="p-4 border border-cyan/30 rounded bg-cyan/5 text-cyan hover:bg-cyan/20">
                <i className="fas fa-industry text-2xl mb-2"></i>
                <div className="font-orbitron text-xs">FIND FACTORIES</div>
            </button>
            <button onClick={() => launchSearch('Hotels')} className="p-4 border border-cyan/30 rounded bg-cyan/5 text-cyan hover:bg-cyan/20">
                <i className="fas fa-hotel text-2xl mb-2"></i>
                <div className="font-orbitron text-xs">FIND HOTELS</div>
            </button>
        </div>

        {/* ADD NEW LEAD */}
        <div className="mb-6 border-t border-cyan/10 pt-4">
            <div className="text-cyan-dim font-mono text-xs mb-2">MANUAL LEAD ENTRY</div>
            <div className="flex flex-col gap-3">
                <input type="text" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="bg-black border border-cyan/30 p-2 text-cyan outline-none" placeholder="Business Name" />
                <input type="text" value={newLead.location} onChange={e => setNewLead({...newLead, location: e.target.value})} className="bg-black border border-cyan/30 p-2 text-cyan outline-none" placeholder="Location" />
                <button onClick={handleAdd} className="bg-cyan text-black font-bold py-2 rounded hover:bg-cyan/80">ADD TARGET</button>
            </div>
        </div>

        {/* LEADS LIST */}
        <div className="space-y-3">
            {leadsLog.map(lead => (
                <div key={lead.id} className={`border p-4 rounded flex justify-between items-center ${getStatusColor(lead.status)} bg-black`}>
                    <div>
                        <div className="font-bold font-orbitron">{lead.name}</div>
                        <div className="text-xs opacity-70">{lead.location} | {lead.dateAdded}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <select 
                            value={lead.status} 
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className="bg-black border border-white/20 text-xs p-1 outline-none rounded text-white"
                        >
                            <option>Potential</option>
                            <option>Contacted</option>
                            <option>Meeting Set</option>
                            <option>Contracted</option>
                            <option>Dead Lead</option>
                        </select>
                        <button onClick={() => deleteLead(lead.id)} className="text-xs text-red-500 hover:text-red-300">REMOVE</button>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
};

export default ReconPanel;
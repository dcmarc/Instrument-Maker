
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Image as ImageIcon, Music, Download, Play, ChevronLeft, Trash2, Save, Wand2, Info, Upload, AlertCircle, FileUp, FileDown, Globe } from 'lucide-react';
import { Project, Hotspot, AppMode } from './types';
import { gemini } from './services/geminiService';
import { audioEngine } from './services/audioEngine';

// --- Helper Functions ---

const downloadProjectFile = (project: Project) => {
  const dataStr = JSON.stringify(project, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `${project.name.replace(/\s+/g, '_').toLowerCase()}.sonic.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

const downloadStandaloneHTML = (project: Project) => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - SonicMapper</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="importmap">
  {
    "imports": {
      "lucide-react": "https://esm.sh/lucide-react@0.460.0",
      "react": "https://esm.sh/react@18.2.0",
      "react-dom": "https://esm.sh/react-dom@18.2.0"
    }
  }
  </script>
</head>
<body class="bg-gray-950 text-white min-h-screen flex items-center justify-center p-4">
  <div id="embed-root" class="w-full max-w-5xl"></div>

  <script type="module">
    import React, { useState, useEffect } from 'react';
    import ReactDOM from 'react-dom';
    import { Music } from 'lucide-react';

    const project = ${JSON.stringify(project)};

    function decode(base64) {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      return bytes;
    }

    async function decodeAudioData(data, ctx, sampleRate, numChannels) {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
      return buffer;
    }

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

    function Player() {
      const [activeNote, setActiveNote] = useState(null);

      const playPCM = async (base64) => {
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        try {
          const bytes = decode(base64);
          const audioBuffer = await decodeAudioData(bytes, audioCtx, 24000, 1);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);
          source.start();
        } catch (e) { console.error(e); }
      };

      return React.createElement('div', { className: 'flex flex-col gap-6' },
        React.createElement('div', { className: 'text-center mb-4' },
          React.createElement('h1', { className: 'text-3xl font-black' }, project.name),
          React.createElement('p', { className: 'text-gray-400 text-sm' }, 'Interactive Instrument Player')
        ),
        React.createElement('div', { className: 'relative rounded-3xl overflow-hidden shadow-2xl bg-black ring-1 ring-gray-800' },
          React.createElement('img', { src: project.image, className: 'w-full h-auto block max-h-[80vh] object-contain mx-auto' }),
          project.hotspots.map(h => 
            React.createElement('button', {
              key: h.id,
              onClick: () => {
                playPCM(h.audioData);
                setActiveNote(h.id);
                setTimeout(() => setActiveNote(null), 350);
              },
              style: { left: h.x + '%', top: h.y + '%' },
              className: 'absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ' + 
                (activeNote === h.id ? 'bg-indigo-500 scale-125 ring-4 ring-white/50' : 'bg-white/80 hover:bg-white hover:scale-110')
            }, 
              React.createElement(Music, { className: 'w-6 h-6 ' + (activeNote === h.id ? 'text-white' : 'text-indigo-600') }),
              activeNote === h.id && React.createElement('span', { className: 'absolute -top-10 bg-indigo-500 text-white px-2 py-1 rounded text-xs font-bold' }, h.label)
            )
          )
        )
      );
    }

    ReactDOM.render(React.createElement(Player), document.getElementById('embed-root'));
  </script>
</body>
</html>
  `;
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/\s+/g, '_').toLowerCase()}.html`;
  link.click();
  URL.revokeObjectURL(url);
};

// --- Components ---

const Header: React.FC = () => (
  <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-950/80 backdrop-blur-md z-50">
    <Link to="/" className="flex items-center gap-2 group">
      <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-500 transition-colors">
        <Music className="w-5 h-5 text-white" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-white">SonicMapper</h1>
    </Link>
  </header>
);

const EmptyState: React.FC<{ onNew: () => void; onImport: () => void }> = ({ onNew, onImport }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
    <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6">
      <ImageIcon className="w-10 h-10 text-gray-700" />
    </div>
    <h2 className="text-2xl font-bold mb-2">No instruments yet</h2>
    <p className="text-gray-400 max-w-sm mb-8">
      Upload a photo of your favorite instrument or import a shared instrument file.
    </p>
    <div className="flex flex-col sm:flex-row gap-4">
      <button
        onClick={onNew}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
      >
        <Plus className="w-5 h-5" />
        Create Instrument
      </button>
      <button
        onClick={onImport}
        className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
      >
        <FileUp className="w-5 h-5" />
        Import (.json)
      </button>
    </div>
  </div>
);

// --- Pages ---

const Home: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sonic_mapper_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, []);

  const createNew = () => {
    const id = Math.random().toString(36).substring(2, 9);
    navigate(`/edit/${id}`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedProject: Project = JSON.parse(event.target?.result as string);
        if (!importedProject.id || !importedProject.name || !importedProject.image) {
          throw new Error("Invalid project file format.");
        }

        const saved = localStorage.getItem('sonic_mapper_projects');
        let allProjects: Project[] = saved ? JSON.parse(saved) : [];
        const existingIndex = allProjects.findIndex(p => p.id === importedProject.id);
        if (existingIndex >= 0) {
          if (window.confirm("An instrument with this ID already exists. Overwrite?")) {
            allProjects[existingIndex] = importedProject;
          } else {
            return;
          }
        } else {
          allProjects.push(importedProject);
        }

        localStorage.setItem('sonic_mapper_projects', JSON.stringify(allProjects));
        setProjects(allProjects);
      } catch (err) {
        alert("Failed to import instrument.");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this instrument?")) {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      localStorage.setItem('sonic_mapper_projects', JSON.stringify(updated));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-bold mb-1">Your Collection</h2>
          <p className="text-gray-400">Manage and play your custom instruments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => importInputRef.current?.click()}
            className="bg-gray-900 border border-gray-800 text-gray-300 hover:text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all"
          >
            <FileUp className="w-5 h-5" />
            Import
          </button>
          <button
            onClick={createNew}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-5 h-5" />
            New Instrument
          </button>
        </div>
      </div>

      <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />

      {projects.length === 0 ? (
        <EmptyState onNew={createNew} onImport={() => importInputRef.current?.click()} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/play/${project.id}`}
              className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-all group relative flex flex-col"
            >
              <div className="aspect-[4/3] relative overflow-hidden bg-black">
                {project.image ? (
                  <img src={project.image} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-800"><ImageIcon className="w-12 h-12" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-lg text-white truncate">{project.name}</h3>
                    <p className="text-xs text-gray-300 uppercase tracking-widest">{project.hotspots.length} Hotspots</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-2 rounded-full flex-shrink-0">
                    <Play className="w-5 h-5 text-white fill-current" />
                  </div>
                </div>
              </div>
              <div className="p-4 flex justify-between items-center bg-gray-900 border-t border-gray-800">
                <div className="flex gap-4">
                   <button onClick={(e) => { e.preventDefault(); navigate(`/edit/${project.id}`); }} className="text-sm text-gray-400 hover:text-white">Edit</button>
                   <button onClick={(e) => { e.preventDefault(); downloadStandaloneHTML(project); }} className="text-sm text-gray-400 hover:text-indigo-400 flex items-center gap-1"><Globe className="w-3 h-3" /> Get Webpage</button>
                </div>
                <button onClick={(e) => deleteProject(project.id, e)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sonic_mapper_projects');
    if (saved) {
      try {
        const allProjects: Project[] = JSON.parse(saved);
        const found = allProjects.find(p => p.id === id);
        if (found) { setProject(found); return; }
      } catch (e) { console.error(e); }
    }
    setProject({ id: id!, name: 'New Instrument', image: '', hotspots: [], createdAt: Date.now() });
  }, [id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setProject(prev => prev ? { ...prev, image: base64 } : null);
        setIsUploading(false);
        setIsAnalyzing(true);
        try {
          const suggestion = await gemini.suggestHotspots(base64.split(',')[1]);
          setAiSuggestions(suggestion);
        } catch (err) { console.error(err); }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedHotspot) {
      updateHotspot(selectedHotspot, { isLoading: true });
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sourceBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const offlineCtx = new OfflineAudioContext(1, (sourceBuffer.duration * 24000), 24000);
        const source = offlineCtx.createBufferSource();
        source.buffer = sourceBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        const renderedBuffer = await offlineCtx.startRendering();
        const channelData = renderedBuffer.getChannelData(0);
        const int16Data = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
          const s = Math.max(-1, Math.min(1, channelData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        let binary = '';
        const bytes = new Uint8Array(int16Data.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        const audioData = btoa(binary);
        const currentHotspot = project?.hotspots.find(h => h.id === selectedHotspot);
        updateHotspot(selectedHotspot, { audioData, isLoading: false, label: (currentHotspot?.label === 'New Spot') ? file.name.split('.')[0] : currentHotspot?.label });
        audioEngine.playPCM(audioData);
      } catch (err) { alert("Audio failed."); updateHotspot(selectedHotspot, { isLoading: false }); }
    }
    if (e.target) e.target.value = '';
  };

  const handleAddHotspot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!project?.image) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newHotspot: Hotspot = { id: Math.random().toString(36).substring(2, 9), x, y, label: 'New Spot', description: 'Standard note' };
    setProject(prev => prev ? { ...prev, hotspots: [...prev.hotspots, newHotspot] } : null);
    setSelectedHotspot(newHotspot.id);
  };

  const updateHotspot = (hotspotId: string, updates: Partial<Hotspot>) => {
    setProject(prev => prev ? { ...prev, hotspots: prev.hotspots.map(h => h.id === hotspotId ? { ...h, ...updates } : h) } : null);
  };

  const removeHotspot = (hotspotId: string) => {
    setProject(prev => prev ? { ...prev, hotspots: prev.hotspots.filter(h => h.id !== hotspotId) } : null);
    setSelectedHotspot(null);
  };

  const generateSound = async (hotspot: Hotspot) => {
    if (!project) return;
    updateHotspot(hotspot.id, { isLoading: true });
    try {
      const audioData = await gemini.generateNote(project.name, hotspot.description);
      updateHotspot(hotspot.id, { audioData, isLoading: false, label: hotspot.label === 'New Spot' ? hotspot.description : hotspot.label });
      if (audioData) audioEngine.playPCM(audioData);
    } catch (err) { updateHotspot(hotspot.id, { isLoading: false }); alert("Failed to generate sound."); }
  };

  const saveProject = () => {
    if (!project) return;
    setIsSaving(true);
    setTimeout(() => {
      try {
        const saved = localStorage.getItem('sonic_mapper_projects');
        let allProjects: Project[] = saved ? JSON.parse(saved) : [];
        const existingIndex = allProjects.findIndex(p => p.id === project.id);
        if (existingIndex >= 0) allProjects[existingIndex] = project;
        else allProjects.push(project);
        localStorage.setItem('sonic_mapper_projects', JSON.stringify(allProjects));
        setIsSaving(false);
        navigate('/');
      } catch (error) { alert("Storage full."); setIsSaving(false); }
    }, 50);
  };

  if (!project) return null;
  const activeHotspot = project.hotspots.find(h => h.id === selectedHotspot);

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 bg-black p-4 md:p-8 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white flex items-center gap-1"><ChevronLeft className="w-5 h-5" />Back</button>
            <input type="text" value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} className="bg-transparent text-2xl font-bold text-center outline-none flex-1" />
            <div className="w-20" />
          </div>
          {!project.image ? (
            <div onClick={() => fileInputRef.current?.click()} className="aspect-video w-full rounded-2xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center hover:border-indigo-500/50 cursor-pointer">
              {isUploading ? <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-500"></div> : <><ImageIcon className="w-8 h-8 text-indigo-500 mb-2" /><p className="font-semibold">Upload Image</p></>}
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden cursor-crosshair shadow-2xl" onClick={handleAddHotspot}>
              <img src={project.image} alt="Upload" className="w-full h-auto block max-h-[70vh] object-contain mx-auto" />
              {project.hotspots.map(h => (
                <button key={h.id} onClick={(e) => { e.stopPropagation(); setSelectedHotspot(h.id); }} style={{ left: `${h.x}%`, top: `${h.y}%` }} className={`absolute group -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${selectedHotspot === h.id ? 'bg-indigo-600 border-white scale-125' : 'bg-white/90 border-indigo-600'}`}>
                  <Music className={`w-4 h-4 ${selectedHotspot === h.id ? 'text-white' : 'text-indigo-600'}`} />
                  <span className={`absolute -top-10 bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${selectedHotspot === h.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{h.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-full md:w-80 lg:w-96 border-l border-gray-800 bg-gray-950 flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          {activeHotspot ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center"><h3 className="font-bold">Edit Hotspot</h3><button onClick={() => removeHotspot(activeHotspot.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 className="w-5 h-5" /></button></div>
              <div className="space-y-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Label</label><input type="text" value={activeHotspot.label} onChange={(e) => updateHotspot(activeHotspot.id, { label: e.target.value })} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Description</label><textarea rows={2} value={activeHotspot.description} onChange={(e) => updateHotspot(activeHotspot.id, { description: e.target.value })} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3" /></div>
                <div className="space-y-3">
                  <button onClick={() => generateSound(activeHotspot)} disabled={activeHotspot.isLoading} className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2">{activeHotspot.isLoading ? 'Generating...' : 'Find Sound with AI'}</button>
                  <button onClick={() => audioInputRef.current?.click()} className="w-full bg-gray-900 border border-gray-800 py-3 rounded-xl">Upload File</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center"><Info className="w-8 h-8 text-gray-700 mb-2" /><p className="text-gray-500 text-sm">Select a point to map sound</p></div>
          )}
        </div>
        <div className="p-6 border-t border-gray-800 space-y-3">
          <button onClick={saveProject} disabled={!project.image || project.hotspots.length === 0 || isSaving} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl">{isSaving ? 'Saving...' : 'Save Instrument'}</button>
          <button onClick={() => downloadStandaloneHTML(project)} className="w-full bg-gray-900 border border-gray-800 py-3 rounded-xl flex items-center justify-center gap-2"><Globe className="w-5 h-5" /> Download Webpage</button>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
      <input type="file" ref={audioInputRef} onChange={handleAudioUpload} className="hidden" accept="audio/*" />
    </div>
  );
};

const Player: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeNote, setActiveNote] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sonic_mapper_projects');
    if (saved) {
      try {
        const allProjects: Project[] = JSON.parse(saved);
        const found = allProjects.find(p => p.id === id);
        if (found) setProject(found);
      } catch (e) { console.error(e); }
    }
  }, [id]);

  const handlePlay = (h: Hotspot) => {
    if (h.audioData) {
      audioEngine.playPCM(h.audioData);
      setActiveNote(h.id);
      setTimeout(() => setActiveNote(null), 350);
    }
  };

  if (!project) return (
    <div className="flex flex-col items-center justify-center py-40 px-6 text-center">
      <AlertCircle className="w-16 h-16 text-gray-800 mb-6" />
      <h2 className="text-2xl font-bold mb-4">Instrument not found</h2>
      <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Collection</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white flex items-center gap-1 mb-2"><ChevronLeft className="w-5 h-5" /> Collection</button>
          <h2 className="text-4xl font-black">{project.name}</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/edit/${project.id}`)} className="bg-gray-900 border border-gray-800 text-gray-300 px-5 py-2.5 rounded-xl">Edit Layout</button>
          <button onClick={() => downloadStandaloneHTML(project)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20"><Globe className="w-5 h-5" /> Download Webpage</button>
        </div>
      </div>
      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black ring-1 ring-gray-800">
        <img src={project.image} alt={project.name} className="w-full h-auto block max-h-[75vh] object-contain mx-auto" />
        {project.hotspots.map(h => (
          <button key={h.id} onClick={() => handlePlay(h)} style={{ left: `${h.x}%`, top: `${h.y}%` }} className={`absolute group -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all ${activeNote === h.id ? 'bg-indigo-500 scale-125 ring-4 ring-white/50' : 'bg-white/80 backdrop-blur-md hover:bg-white hover:scale-110 shadow-lg'}`}>
            <Music className={`w-5 h-5 sm:w-6 sm:h-6 ${activeNote === h.id ? 'text-white' : 'text-indigo-600'}`} />
            <span className={`absolute -top-12 bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${activeNote === h.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100'}`}>{h.label}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 mb-20">
        {project.hotspots.map(h => (
          <button key={h.id} onClick={() => handlePlay(h)} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${activeNote === h.id ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeNote === h.id ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400'}`}><Music className="w-4 h-4" /></div>
            <span className="text-[10px] font-bold text-gray-400 truncate w-full uppercase">{h.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-gray-950 text-white">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/edit/:id" element={<Editor />} />
            <Route path="/play/:id" element={<Player />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;

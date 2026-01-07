
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Wallet, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Search,
  ChevronRight,
  MessageSquare,
  Calendar,
  GraduationCap,
  Download,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Info,
  Sparkles,
  Smartphone,
  Building,
  CheckCircle2,
  ArrowLeft,
  GripVertical,
  Edit2,
  Camera,
  Layers,
  MapPinned,
  UserCheck
} from 'lucide-react';
import { MOCK_USER, MOCK_ANNOUNCEMENTS, MOCK_COURSES, MOCK_FEES, MOCK_EXAMS } from './constants';
import { Announcement, Course, Message, Exam } from './types';
import { getAcademicAdvice, getNavigationIntent } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  highlight?: boolean;
  onClick: () => void 
}> = ({ icon, label, active, highlight, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all relative ${
      active ? 'bg-[#9b1c1c] text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'
    } ${highlight ? 'ring-4 ring-yellow-400 ring-offset-2 animate-pulse z-20 scale-105' : ''}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
    {highlight && (
      <span className="absolute -right-2 -top-2 bg-yellow-500 text-white p-1 rounded-full shadow-lg">
        <Sparkles size={12} />
      </span>
    )}
  </button>
);

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Clarification state
  const [pendingClarification, setPendingClarification] = useState<{ type: string; item: any; path: string[]; targetState?: any } | null>(null);

  // Navigation History
  const [navHistory, setNavHistory] = useState<Record<string, { tab: string; view?: string; item?: any }>>({});

  // Resize state
  const [chatWidth, setChatWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Sub-view States
  const [financeView, setFinanceView] = useState<'summary' | 'mode_selection' | 'payment_details' | 'success'>('summary');
  const [academicView, setAcademicView] = useState<'list' | 'internals'>('list');
  const [examView, setExamView] = useState<'list' | 'details'>('list');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string | null>(null);
  
  // Profile State
  const [userProfile, setUserProfile] = useState(MOCK_USER);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Guided Path Engine
  const [guidePath, setGuidePath] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isDeviated, setIsDeviated] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  
  const activityCount = useRef(0);
  const currentHighlight = currentStepIndex >= 0 ? guidePath[currentStepIndex] : null;
  const CHART_COLORS = ['#9b1c1c', '#3b82f6', '#10b981', '#f59e0b'];

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.6) {
        setChatWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const jumpToDestination = (dest: { tab: string; view?: string; item?: any }) => {
    setActiveTab(dest.tab);
    if (dest.tab === 'Academics' && dest.view === 'internals') {
      setSelectedCourse(dest.item);
      setAcademicView('internals');
    } else if (dest.tab === 'Exam Schedule' && dest.view === 'details') {
      setSelectedExam(dest.item);
      setExamView('details');
    } else if (dest.tab === 'Finance') {
      setFinanceView(dest.view as any || 'summary');
    } else if (dest.tab === 'Profile' && dest.view === 'edit') {
      setIsEditingProfile(true);
    }
    setGuidePath([]);
    setCurrentStepIndex(-1);
    setChatMessages(prev => [...prev, { role: 'model', text: `I remembered your preference! Jumping directly to your ${dest.tab} destination.` }]);
  };

  const saveToHistory = (query: string, dest: { tab: string; view?: string; item?: any }) => {
    setNavHistory(prev => ({ ...prev, [query.toLowerCase()]: dest }));
  };

  const trackStep = (elementId: string) => {
    if (currentHighlight === elementId) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < guidePath.length) {
        setCurrentStepIndex(nextIndex);
        setChatMessages(prev => [...prev, { role: 'model', text: "Excellent! Now, proceed to the next highlighted element." }]);
      } else {
        setGuidePath([]);
        setCurrentStepIndex(-1);
        setChatMessages(prev => [...prev, { role: 'model', text: "Target reached! Anything else I can assist with?" }]);
      }
      setIsDeviated(false);
    } else if (guidePath.length > 0 && !elementId.startsWith('agent:')) {
      setIsDeviated(true);
      if (!chatOpen) setHasNotification(true);
    }
  };

  const getOrdinal = (text: string): number | null => {
    const t = text.toLowerCase();
    if (t.includes('last before') || t.includes('second last') || t.includes('2nd last')) return -2;
    if (t.includes('third last') || t.includes('3rd last')) return -3;
    if (t.includes('last')) return -1;
    if (t.includes('first') || t.includes('1st')) return 0;
    if (t.includes('second') || t.includes('2nd')) return 1;
    if (t.includes('third') || t.includes('3rd')) return 2;
    if (t.includes('fourth') || t.includes('4th')) return 3;
    return null;
  };

  const resolveTarget = (list: any[], ordinal: number | null) => {
    if (ordinal === null || list.length === 0) return null;
    if (ordinal < 0) {
      const idx = list.length + ordinal;
      return idx >= 0 ? list[idx] : null;
    }
    return list[ordinal] || null;
  };

  const fuzzySearch = (query: string, items: any[], field: string) => {
    query = query.toLowerCase().trim();
    if (!query) return null;
    return items.find(item => {
      const val = item[field].toLowerCase();
      return val.includes(query) || query.includes(val);
    });
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    const userText = userInput.toLowerCase().trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userInput }]);
    setUserInput('');
    setIsTyping(true);

    if (navHistory[userText]) {
      jumpToDestination(navHistory[userText]);
      setIsTyping(false);
      return;
    }

    if (pendingClarification && (userText === 'yes' || userText === 'yeah' || userText.includes('correct'))) {
      setGuidePath(pendingClarification.path);
      setCurrentStepIndex(0);
      setChatMessages(prev => [...prev, { role: 'model', text: `Confirmed! Follow the path. Click the highlighted tab first.` }]);
      if (pendingClarification.targetState) saveToHistory(userInput.toLowerCase(), pendingClarification.targetState);
      setPendingClarification(null);
      setIsTyping(false);
      return;
    } else if (pendingClarification && (userText === 'no' || userText.includes('wrong'))) {
      setChatMessages(prev => [...prev, { role: 'model', text: "My apologies. Please specify what you're looking for with more detail." }]);
      setPendingClarification(null);
      setIsTyping(false);
      return;
    }

    const ordinalIndex = getOrdinal(userText);

    // Profile Edit Guidance
    if (userText.includes('edit profile') || userText.includes('change bio') || userText.includes('modify bio')) {
      setGuidePath(['tab:Profile', 'btn:modify-bio']);
      setCurrentStepIndex(0);
      setChatMessages(prev => [...prev, { role: 'model', text: "Sure! Let's edit your profile. Click on 'Profile' first." }]);
      saveToHistory(userText, { tab: 'Profile', view: 'edit' });
      setIsTyping(false);
      return;
    }

    // Finance / In-person Guidance
    const financeKeywords = ['pay', 'fee', 'due', 'debt', 'money', 'cash', 'person', 'counter'];
    if (financeKeywords.some(k => userText.includes(k))) {
      let path = ['tab:Finance', 'btn:pay-outstanding'];
      let view = 'mode_selection';
      if (userText.includes('person') || userText.includes('cash') || userText.includes('counter') || userText.includes('offline')) {
        path.push('btn:mode-person');
        view = 'success';
      }
      setGuidePath(path);
      setCurrentStepIndex(0);
      setChatMessages(prev => [...prev, { role: 'model', text: "I'll guide you through the payment process. Start by clicking 'Finance'." }]);
      saveToHistory(userText, { tab: 'Finance', view });
      setIsTyping(false);
      return;
    }

    // Exam Guidance
    const examKeywords = ['exam', 'test', 'timetable'];
    if (examKeywords.some(k => userText.includes(k))) {
      const sortedExams = [...MOCK_EXAMS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (ordinalIndex !== null) {
        const target = resolveTarget(sortedExams, ordinalIndex);
        if (target) {
          setGuidePath(['tab:Exam Schedule', `btn:view-exam-${target.code}`]);
          setCurrentStepIndex(0);
          setChatMessages(prev => [...prev, { role: 'model', text: `Found your ${target.subject} exam. Click 'Exam Schedule'.` }]);
          saveToHistory(userText, { tab: 'Exam Schedule', view: 'details', item: target });
        } else {
          setChatMessages(prev => [...prev, { role: 'model', text: "No such exam found. You have only 4 exams scheduled." }]);
        }
        setIsTyping(false);
        return;
      }
      const possibleMatch = fuzzySearch(userText.replace('exam', '').trim(), MOCK_EXAMS, 'subject');
      if (possibleMatch) {
        setPendingClarification({
          type: 'exam',
          item: possibleMatch,
          path: ['tab:Exam Schedule', `btn:view-exam-${possibleMatch.code}`],
          targetState: { tab: 'Exam Schedule', view: 'details', item: possibleMatch }
        });
        setChatMessages(prev => [...prev, { role: 'model', text: `Are you searching for the "${possibleMatch.subject}" exam?` }]);
        setIsTyping(false);
        return;
      }
    }

    // Default intent
    const targetTab = await getNavigationIntent(userText);
    if (targetTab !== 'None' && targetTab !== activeTab) {
      setGuidePath([`tab:${targetTab}`]);
      setCurrentStepIndex(0);
      setChatMessages(prev => [...prev, { role: 'model', text: `I'll guide you to the ${targetTab} section. Click the highlighted tab.` }]);
      saveToHistory(userText, { tab: targetTab });
    } else {
      const aiResponse = await getAcademicAdvice(chatMessages, userInput);
      setChatMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
    }
    setIsTyping(false);
  };

  const onTabClick = (tabName: string) => {
    trackStep(`tab:${tabName}`);
    if (tabName !== 'Finance') setFinanceView('summary');
    if (tabName !== 'Academics') setAcademicView('list');
    if (tabName !== 'Exam Schedule') setExamView('list');
    setActiveTab(tabName);
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="xl:col-span-2 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500 mb-1">Current CGPA</p><p className="text-3xl font-bold text-[#9b1c1c]">{userProfile.cgpa}</p></div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><GraduationCap size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500 mb-1">Attendance</p><p className="text-3xl font-bold text-blue-600">{userProfile.attendance}%</p></div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><BookOpen size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500 mb-1">Exams Pending</p><p className="text-3xl font-bold text-orange-600">04</p></div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Calendar size={24} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-black">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-lg uppercase tracking-tight">Recent Courses</h3>
            <button onClick={() => onTabClick('Academics')} className="text-sm font-black text-[#9b1c1c] hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-black text-[10px] uppercase font-black tracking-widest"><tr><th className="px-6 py-4">Course</th><th className="px-6 py-4">Grade</th><th className="px-6 py-4">Attendance</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_COURSES.slice(0, 3).map((course) => (
                  <tr key={course.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4"><div><p className="font-black">{course.name}</p><p className="text-[10px] font-bold text-slate-500">{course.code}</p></div></td>
                    <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700">{course.grade}</span></td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden"><div className={`h-full ${course.attendance < 75 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${course.attendance}%` }} /></div><span className="text-xs font-black">{course.attendance}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
        <h3 className="font-black text-lg text-black mb-6 uppercase tracking-tight">Latest Circulars</h3>
        <div className="space-y-4">
          {MOCK_ANNOUNCEMENTS.map((item) => (
            <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <h4 className="font-black text-sm text-black line-clamp-1">{item.title}</h4>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAcademics = () => {
    if (academicView === 'internals' && selectedCourse) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <button onClick={() => setAcademicView('list')} className="flex items-center gap-2 text-black hover:text-[#9b1c1c] font-black uppercase tracking-widest text-xs"><ArrowLeft size={18} /> Back to Courses</button>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h3 className="text-3xl font-black text-black mb-2 uppercase tracking-tight">{selectedCourse.name}</h3>
            <p className="text-[#9b1c1c] font-black tracking-widest text-sm mb-10">{selectedCourse.code} • INTERNAL ANALYSIS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={selectedCourse.internals || []} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value">
                      {selectedCourse.internals?.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-5">
                <h4 className="font-black text-black border-b-2 border-slate-100 pb-3 uppercase tracking-widest text-sm flex items-center gap-2"><Layers size={18} className="text-[#9b1c1c]" /> Component Breakdown</h4>
                {selectedCourse.internals?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="font-black text-black uppercase tracking-tight text-xs">{item.name}</span>
                    <span className="font-black text-[#9b1c1c] text-lg">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-xl font-black text-black mb-8 uppercase tracking-tight">Course Registration</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-black text-[10px] uppercase font-black tracking-widest">
              <tr><th className="px-6 py-5">Code</th><th className="px-6 py-5">Course Name</th><th className="px-6 py-5">Credits</th><th className="px-6 py-5">Attendance</th><th className="px-6 py-5">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_COURSES.map((course) => (
                <tr key={course.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 font-mono font-black text-sm text-[#9b1c1c]">{course.code}</td>
                  <td className="px-6 py-5 font-black uppercase text-sm">{course.name}</td>
                  <td className="px-6 py-5 font-black">{course.credits}</td>
                  <td className="px-6 py-5"><span className={`font-black ${course.attendance < 75 ? 'text-red-600' : 'text-green-700'}`}>{course.attendance}%</span></td>
                  <td className="px-6 py-5">
                    <button 
                      id={`btn:view-marks-${course.code}`} 
                      onClick={() => { trackStep(`btn:view-marks-${course.code}`); setSelectedCourse(course); setAcademicView('internals'); }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentHighlight === `btn:view-marks-${course.code}` ? 'bg-yellow-400 text-black ring-4 ring-yellow-400 ring-offset-2 scale-105 z-10 shadow-lg' : 'bg-[#9b1c1c] text-white hover:bg-black'}`}
                    >
                      <Layers size={14} className="inline mr-2" /> View Marks
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderExams = () => {
    if (examView === 'details' && selectedExam) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <button onClick={() => setExamView('list')} className="flex items-center gap-2 text-black hover:text-[#9b1c1c] font-black uppercase tracking-widest text-xs"><ArrowLeft size={18} /> Back to Timetable</button>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6 text-black">
              <div><span className="bg-[#9b1c1c] text-white text-[10px] font-black px-2 py-1 rounded uppercase">{selectedExam.code}</span><h3 className="text-3xl font-black mt-2 uppercase tracking-tighter">{selectedExam.subject}</h3></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200"><p className="text-[10px] text-slate-500 font-black uppercase mb-1">Date</p><p className="font-black">{selectedExam.date}</p></div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200"><p className="text-[10px] text-slate-500 font-black uppercase mb-1">Time</p><p className="font-black">{selectedExam.time}</p></div>
              </div>
              <div className="p-5 bg-red-50 rounded-2xl border border-red-200"><p className="text-[10px] text-red-700 font-black uppercase mb-1">Venue</p><p className="font-black text-red-900 text-xl uppercase">{selectedExam.location}</p></div>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <h4 className="font-black mb-6 uppercase tracking-widest text-sm border-b-2 border-slate-200 pb-3">Syllabus Portions</h4>
              <ul className="space-y-3">
                {selectedExam.portions.map((p, i) => <li key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 font-black text-sm uppercase"><div className="w-2 h-2 rounded-full bg-[#9b1c1c]" /> {p}</li>)}
              </ul>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-xl font-black text-black mb-8 uppercase tracking-tight">Examination Timetable</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MOCK_EXAMS.map((exam, i) => (
            <button 
              key={i} id={`btn:view-exam-${exam.code}`} 
              onClick={() => { trackStep(`btn:view-exam-${exam.code}`); setSelectedExam(exam); setExamView('details'); }}
              className={`p-6 rounded-3xl border-2 text-left transition-all hover:shadow-xl relative ${currentHighlight === `btn:view-exam-${exam.code}` ? 'bg-yellow-400 border-yellow-400 ring-4 ring-yellow-400 ring-offset-2 scale-105 z-10' : 'bg-slate-50 border-slate-200 hover:border-[#9b1c1c]'}`}
            >
              <span className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{exam.code}</span>
              <h4 className="font-black text-black mt-4 mb-5 h-12 line-clamp-2 uppercase leading-tight">{exam.subject}</h4>
              <p className="text-[11px] text-slate-500 font-black uppercase border-t pt-4">{exam.date}</p>
              <div className="mt-4 flex items-center justify-between"><span className="text-[10px] font-black uppercase text-[#9b1c1c]">Details</span><ChevronRight size={18} className="text-slate-300" /></div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderFinance = () => {
    if (financeView === 'mode_selection') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <button onClick={() => setFinanceView('summary')} className="flex items-center gap-2 text-black hover:text-[#9b1c1c] font-black uppercase tracking-widest text-xs"><ArrowLeft size={18} /> Back</button>
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 max-w-3xl mx-auto">
            <h3 className="text-3xl font-black text-black mb-10 text-center uppercase tracking-tighter">Select Payment Mode</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { id: 'mode-upi', label: 'UPI', icon: <Smartphone size={40} /> },
                { id: 'mode-card', label: 'Card', icon: <CreditCard size={40} /> },
                { id: 'mode-netbanking', label: 'Net Banking', icon: <Building size={40} /> },
                { id: 'mode-person', label: 'Offline / Cash', icon: <UserIcon size={40} /> },
              ].map(mode => (
                <button 
                  key={mode.id} id={`btn:${mode.id}`} 
                  onClick={() => { trackStep(`btn:${mode.id}`); if (mode.id === 'mode-person') setFinanceView('success'); else setFinanceView('payment_details'); }}
                  className={`p-10 rounded-3xl border-4 transition-all flex flex-col items-center gap-4 relative ${currentHighlight === `btn:${mode.id}` ? 'border-yellow-400 bg-yellow-50 ring-8 ring-yellow-400/20 scale-105 z-10' : 'border-slate-50 hover:border-[#9b1c1c] hover:bg-slate-50'}`}
                >
                  <div className="text-slate-400">{mode.icon}</div><span className="font-black text-black uppercase tracking-widest text-xs">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (financeView === 'success') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] animate-in zoom-in-95">
          <div className="w-24 h-24 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-6 shadow-xl"><CheckCircle2 size={48} /></div>
          <h3 className="text-4xl font-black text-black uppercase mb-4">Transfer Recorded</h3>
          <p className="text-slate-500 font-bold mb-10">Verification pending at counter.</p>
          <button onClick={() => setFinanceView('summary')} className="px-10 py-4 bg-black text-white rounded-2xl font-black uppercase hover:bg-[#9b1c1c] transition-all">Back to Summary</button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 md:col-span-2">
          <h3 className="text-2xl font-black text-black mb-8 uppercase tracking-tight">Ledger Summary</h3>
          <div className="space-y-4">
            {MOCK_FEES.map((fee, i) => (
              <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${fee.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}><CreditCard size={20} /></div><div><p className="font-black text-sm uppercase">{fee.title}</p><p className="text-[10px] font-black uppercase text-slate-400">{fee.status}</p></div></div>
                <p className="font-black text-xl">₹{fee.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#1e293b] p-10 rounded-[48px] shadow-2xl text-white flex flex-col justify-between border-b-[12px] border-[#9b1c1c]">
          <div><h4 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-4">Total Outstanding</h4><p className="text-5xl font-black tracking-tighter">₹15,000</p></div>
          <button id="btn:pay-outstanding" onClick={() => { trackStep('btn:pay-outstanding'); setFinanceView('mode_selection'); }} className={`w-full py-5 rounded-3xl font-black uppercase tracking-widest transition-all ${currentHighlight === 'btn:pay-outstanding' ? 'bg-yellow-400 text-black ring-8 ring-yellow-400/30 scale-105' : 'bg-white text-black hover:bg-slate-200'}`}>Pay Now</button>
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-[#9b1c1c] to-black flex items-end justify-end p-8">
          <button 
            id="btn:modify-bio" 
            onClick={() => { trackStep('btn:modify-bio'); setIsEditingProfile(!isEditingProfile); }} 
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-xl relative transition-all ${currentHighlight === 'btn:modify-bio' ? 'bg-yellow-400 text-black border-yellow-400 ring-8 ring-yellow-400/30 animate-bounce' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
          >
            {isEditingProfile ? "Finalize Changes" : "Modify Bio"}
          </button>
        </div>
        <div className="px-10 pb-10 -mt-20">
          <img src={userProfile.avatar} className="w-40 h-40 rounded-[40px] border-8 border-white shadow-2xl mb-8 bg-slate-100" alt="Avatar" />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div><h3 className="text-4xl font-black text-black tracking-tighter uppercase">{userProfile.name}</h3><p className="text-[#9b1c1c] font-black tracking-widest uppercase">{userProfile.rollNumber}</p></div>
            <div className="flex gap-2"><span className="px-4 py-2 bg-black text-white rounded-xl font-black text-[10px] uppercase">{userProfile.department}</span><span className="px-4 py-2 bg-slate-100 text-black rounded-xl font-black text-[10px] uppercase">Sem {userProfile.semester}</span></div>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200"><p className="text-[10px] text-slate-500 font-black uppercase mb-2">Email</p><p className="font-black text-black">{userProfile.email}</p></div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200"><p className="text-[10px] text-slate-500 font-black uppercase mb-2">Phone</p><p className="font-black text-black">{userProfile.phone}</p></div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200"><p className="text-[10px] text-slate-500 font-black uppercase mb-2">Blood Group</p><p className="font-black text-black">{userProfile.bloodGroup}</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const getActiveTabContent = () => {
    switch (activeTab) {
      case 'Dashboard': return renderDashboard();
      case 'Academics': return renderAcademics();
      case 'Finance': return renderFinance();
      case 'Exam Schedule': return renderExams();
      case 'Announcements': return <div className="p-10 text-center font-black uppercase opacity-40">Notice Board Implementation pending</div>;
      case 'Profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl lg:shadow-none`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-16"><div className="w-10 h-10 bg-[#9b1c1c] rounded-xl flex items-center justify-center text-white"><GraduationCap size={24} /></div><h1 className="text-xl font-black uppercase leading-tight">Amrita <span className="text-[#9b1c1c]">CMS</span></h1></div>
          <nav className="space-y-2 flex-1">
            <SidebarItem onClick={() => onTabClick('Dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'Dashboard'} highlight={currentHighlight === 'tab:Dashboard'} />
            <SidebarItem onClick={() => onTabClick('Academics')} icon={<BookOpen size={20} />} label="Academics" active={activeTab === 'Academics'} highlight={currentHighlight === 'tab:Academics'} />
            <SidebarItem onClick={() => onTabClick('Finance')} icon={<Wallet size={20} />} label="Finance" active={activeTab === 'Finance'} highlight={currentHighlight === 'tab:Finance'} />
            <SidebarItem onClick={() => onTabClick('Exam Schedule')} icon={<Calendar size={20} />} label="Exam Schedule" active={activeTab === 'Exam Schedule'} highlight={currentHighlight === 'tab:Exam Schedule'} />
            <SidebarItem onClick={() => onTabClick('Profile')} icon={<UserIcon size={20} />} label="Profile" active={activeTab === 'Profile'} highlight={currentHighlight === 'tab:Profile'} />
          </nav>
        </div>
      </aside>
      <main className={`flex-1 transition-all ${isSidebarOpen ? 'lg:ml-80' : 'ml-0'} p-6 lg:p-14 overflow-y-auto`} style={{ marginRight: chatOpen ? chatWidth : 0 }}>
        <header className="flex justify-between items-center mb-14"><h2 className="text-5xl font-black uppercase tracking-tighter">{activeTab}</h2><div className="flex items-center gap-4 bg-white p-2 px-6 rounded-2xl shadow-sm border border-slate-100"><div className="text-right hidden sm:block"><p className="text-xs font-black uppercase">{userProfile.name}</p><p className="text-[10px] text-slate-400 uppercase">{userProfile.rollNumber}</p></div><img src={userProfile.avatar} className="w-10 h-10 rounded-xl" alt="user" /></div></header>
        {getActiveTabContent()}
      </main>

      {!chatOpen && <button onClick={() => { setChatOpen(true); trackStep('agent:open-button'); }} className="fixed bottom-10 right-10 bg-[#9b1c1c] text-white p-6 rounded-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all"><MessageSquare size={32} /></button>}

      {chatOpen && (
        <div className="fixed inset-y-0 right-0 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-[70]" style={{ width: chatWidth }}>
          <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[#9b1c1c]" onMouseDown={startResizing} />
          <div className="p-8 bg-[#9b1c1c] text-white flex justify-between items-center"><h3 className="font-black uppercase tracking-widest text-sm">System Oracle</h3><button onClick={() => setChatOpen(false)}><X size={28} /></button></div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50">
            {chatMessages.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-4 rounded-2xl text-sm font-black shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-tr-none' : 'bg-white text-black border-2 border-slate-100 rounded-tl-none'}`}>{msg.text}</div></div>)}
            {isTyping && <div className="flex gap-1 p-4 bg-white rounded-2xl w-16 animate-pulse"><div className="w-2 h-2 bg-[#9b1c1c] rounded-full" /><div className="w-2 h-2 bg-[#9b1c1c] rounded-full" /><div className="w-2 h-2 bg-[#9b1c1c] rounded-full" /></div>}
          </div>
          <div className="p-6 border-t bg-white">
            {isDeviated && guidePath.length > 0 && <div className="mb-4 p-4 bg-orange-100 rounded-2xl text-[10px] font-black uppercase flex justify-between items-center"><span>Path Lost. Resume?</span><button onClick={() => setIsDeviated(false)} className="bg-orange-600 text-white px-4 py-2 rounded-xl">RESUME</button></div>}
            <div className="flex gap-2"><input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Ask Oracle..." className="flex-1 bg-slate-100 rounded-2xl px-6 py-4 font-black text-sm outline-none" /><button onClick={handleSendMessage} className="bg-black text-white p-4 rounded-2xl"><ChevronRight size={24} /></button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

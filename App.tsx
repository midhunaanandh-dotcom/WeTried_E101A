
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
  const [pendingClarification, setPendingClarification] = useState<{ type: string; item: any; path: string[] } | null>(null);

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

  // --- Guided Path Engine ---
  const [guidePath, setGuidePath] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isDeviated, setIsDeviated] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  
  const activityCount = useRef(0);
  const lastInteractionTime = useRef(Date.now());

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

  useEffect(() => {
    const handleActivity = () => {
      activityCount.current += 1;
      lastInteractionTime.current = Date.now();
      if (activityCount.current > 150 && !chatOpen && guidePath.length === 0) {
        setChatMessages(prev => [...prev, { role: 'model', text: "I noticed you're moving around a lot! Are you having trouble finding something specific?" }]);
        setHasNotification(true);
        activityCount.current = 0;
      }
    };
    window.addEventListener('mousemove', handleActivity);
    return () => window.removeEventListener('mousemove', handleActivity);
  }, [chatOpen, guidePath]);

  const trackStep = (elementId: string) => {
    if (currentHighlight === elementId) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < guidePath.length) {
        setCurrentStepIndex(nextIndex);
        setChatMessages(prev => [...prev, { role: 'model', text: "Perfect! Now, click the highlighted element to continue." }]);
      } else {
        setGuidePath([]);
        setCurrentStepIndex(-1);
        setChatMessages(prev => [...prev, { role: 'model', text: "We've reached your destination! Is there anything else you need?" }]);
      }
      setIsDeviated(false);
    } else if (guidePath.length > 0 && !elementId.startsWith('agent:')) {
      setIsDeviated(true);
      if (!chatOpen) setHasNotification(true);
    }
  };

  const getOrdinal = (text: string): number | null => {
    const t = text.toLowerCase();
    // Complex relative ordinals
    if (t.includes('last before') || t.includes('second last') || t.includes('2nd last')) return -2;
    if (t.includes('third last') || t.includes('3rd last')) return -3;
    if (t.includes('last')) return -1;
    
    // Absolute ordinals
    if (t.includes('first') || t.includes('1st')) return 0;
    if (t.includes('second') || t.includes('2nd')) return 1;
    if (t.includes('third') || t.includes('3rd')) return 2;
    if (t.includes('fourth') || t.includes('4th')) return 3;
    if (t.includes('fifth') || t.includes('5th')) return 4;
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
    const userText = userInput.toLowerCase();
    setChatMessages(prev => [...prev, { role: 'user', text: userInput }]);
    setUserInput('');
    setIsTyping(true);

    // 0. Handle Clarification
    if (pendingClarification && (userText === 'yes' || userText === 'yeah' || userText.includes('correct') || userText.includes('yup'))) {
      setGuidePath(pendingClarification.path);
      setCurrentStepIndex(0);
      setChatMessages(prev => [...prev, { role: 'model', text: `Got it. Let's head there now. Click on the highlighted tab.` }]);
      setPendingClarification(null);
      setIsTyping(false);
      return;
    } else if (pendingClarification && (userText === 'no' || userText.includes('wrong') || userText.includes('nope'))) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Understood. Please provide more details so I can find exactly what you need." }]);
      setPendingClarification(null);
      setIsTyping(false);
      return;
    }

    const ordinalIndex = getOrdinal(userText);

    // 1. Finance / Payment Logic (Multi-step guidance)
    const financeKeywords = ['pay', 'fee', 'due', 'debt', 'money', 'billing', 'cash', 'upi', 'card'];
    if (financeKeywords.some(k => userText.includes(k))) {
      let path = ['tab:Finance', 'btn:pay-outstanding'];
      let modeText = "";
      
      if (userText.includes('person') || userText.includes('cash') || userText.includes('counter') || userText.includes('offline')) {
        path.push('btn:mode-person');
        modeText = " for In-Person payment";
      } else if (userText.includes('upi') || userText.includes('phonepe') || userText.includes('gpay')) {
        path.push('btn:mode-upi');
        modeText = " via UPI";
      } else if (userText.includes('card') || userText.includes('debit') || userText.includes('credit')) {
        path.push('btn:mode-card');
        modeText = " via Card";
      } else if (userText.includes('net') || userText.includes('banking') || userText.includes('internet')) {
        path.push('btn:mode-netbanking');
        modeText = " via Net Banking";
      }

      setGuidePath(path);
      setCurrentStepIndex(0);
      setChatMessages(prev => [...prev, { role: 'model', text: `I'll help you with that payment${modeText}. First, click on the 'Finance' tab.` }]);
      setIsTyping(false);
      return;
    }

    // 2. Exam Search Logic
    const examKeywords = ['exam', 'test', 'scheduled', 'timetable'];
    if (examKeywords.some(k => userText.includes(k))) {
      const sortedExams = [...MOCK_EXAMS].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (ordinalIndex !== null) {
        const target = resolveTarget(sortedExams, ordinalIndex);
        if (target) {
          setGuidePath(['tab:Exam Schedule', `btn:view-exam-${target.code}`]);
          setCurrentStepIndex(0);
          setChatMessages(prev => [...prev, { role: 'model', text: `Found it. Your ${target?.subject} exam is on ${target?.date}. Click 'Exam Schedule' to see more.` }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'model', text: "I couldn't find an exam at that position. You only have 4 scheduled exams." }]);
        }
        setIsTyping(false);
        return;
      }

      // Subject fuzzy match
      const subjectQuery = userText.replace('exam', '').replace('test', '').replace('timetable', '').trim();
      const possibleMatch = fuzzySearch(subjectQuery, MOCK_EXAMS, 'subject');
      if (possibleMatch) {
        setPendingClarification({
          type: 'exam',
          item: possibleMatch,
          path: ['tab:Exam Schedule', `btn:view-exam-${possibleMatch.code}`]
        });
        setChatMessages(prev => [...prev, { role: 'model', text: `Are you searching for the "${possibleMatch.subject}" exam?` }]);
        setIsTyping(false);
        return;
      }
    }

    // 3. Marks / Course Logic
    const markKeywords = ['mark', 'internal', 'grade', 'percentage', 'how did i do', 'result'];
    if (markKeywords.some(k => userText.includes(k))) {
      if (ordinalIndex !== null) {
        const target = resolveTarget(MOCK_COURSES, ordinalIndex);
        if (target) {
          setGuidePath(['tab:Academics', `btn:view-marks-${target.code}`]);
          setCurrentStepIndex(0);
          setChatMessages(prev => [...prev, { role: 'model', text: `Navigating to ${target?.name} marks. First, click on 'Academics'.` }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'model', text: `Invalid course selection. You have ${MOCK_COURSES.length} registered courses.` }]);
        }
        setIsTyping(false);
        return;
      }

      const courseQuery = userText.replace('mark', '').replace('internal', '').replace('grade', '').trim();
      const possibleMatch = fuzzySearch(courseQuery, MOCK_COURSES, 'name');
      if (possibleMatch) {
        setPendingClarification({
          type: 'course',
          item: possibleMatch,
          path: ['tab:Academics', `btn:view-marks-${possibleMatch.code}`]
        });
        setChatMessages(prev => [...prev, { role: 'model', text: `Are you searching for marks/internals in "${possibleMatch.name}"?` }]);
        setIsTyping(false);
        return;
      }
    }

    // 4. Circulars / Announcements
    const circularKeywords = ['circular', 'notice', 'announcement', 'news'];
    if (circularKeywords.some(k => userText.includes(k))) {
      const sortedAnnouncements = [...MOCK_ANNOUNCEMENTS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (ordinalIndex !== null) {
        const target = resolveTarget(sortedAnnouncements, ordinalIndex);
        if (target) {
          setGuidePath(['tab:Announcements', `card:announcement-${target.id}`]);
          setCurrentStepIndex(0);
          setChatMessages(prev => [...prev, { role: 'model', text: `Navigating to that circular. Click 'Announcements' to view.` }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'model', text: "No announcement found at that position." }]);
        }
        setIsTyping(false);
        return;
      }

      const newsQuery = userText.replace('circular', '').replace('notice', '').trim();
      const possibleMatch = fuzzySearch(newsQuery, MOCK_ANNOUNCEMENTS, 'title');
      if (possibleMatch) {
        setPendingClarification({
          type: 'announcement',
          item: possibleMatch,
          path: ['tab:Announcements', `card:announcement-${possibleMatch.id}`]
        });
        setChatMessages(prev => [...prev, { role: 'model', text: `Are you searching for the notice titled "${possibleMatch.title}"?` }]);
        setIsTyping(false);
        return;
      }
    }

    // 5. Navigation Clues
    const targetTab = await getNavigationIntent(userText);
    if (targetTab !== 'None' && targetTab !== activeTab) {
      setGuidePath([`tab:${targetTab}`]);
      setCurrentStepIndex(0);
      setChatMessages(prev => [...prev, { role: 'model', text: `Certainly. I'll take you to the ${targetTab} section. Click the highlighted tab.` }]);
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
    activityCount.current = 0;
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="xl:col-span-2 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Current CGPA</p>
              <p className="text-3xl font-bold text-[#9b1c1c]">{userProfile.cgpa}</p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><GraduationCap size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Attendance</p>
              <p className="text-3xl font-bold text-blue-600">{userProfile.attendance}%</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><BookOpen size={24} /></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Exams Pending</p>
              <p className="text-3xl font-bold text-orange-600">04</p>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Calendar size={24} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-black">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-lg text-black uppercase tracking-tight">Recent Courses</h3>
            <button onClick={() => onTabClick('Academics')} className="text-sm font-black text-[#9b1c1c] hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-black text-[10px] uppercase font-black tracking-widest">
                <tr><th className="px-6 py-4">Course</th><th className="px-6 py-4">Grade</th><th className="px-6 py-4">Attendance</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_COURSES.slice(0, 3).map((course) => (
                  <tr key={course.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4"><div><p className="font-black">{course.name}</p><p className="text-[10px] font-bold text-slate-500">{course.code}</p></div></td>
                    <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700">{course.grade}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[100px]">
                          <div className={`h-full rounded-full ${course.attendance < 75 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${course.attendance}%` }} />
                        </div>
                        <span className="text-xs font-black">{course.attendance}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-black text-lg text-black mb-6 uppercase tracking-tight">Latest Circulars</h3>
          <div className="space-y-4">
            {MOCK_ANNOUNCEMENTS.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h4 className="font-black text-sm text-black line-clamp-1">{item.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 font-medium">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAcademics = () => {
    if (academicView === 'internals' && selectedCourse) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <button onClick={() => setAcademicView('list')} className="flex items-center gap-2 text-black hover:text-[#9b1c1c] transition-colors font-black uppercase tracking-widest text-xs">
            <ArrowLeft size={18} /> Back to Courses
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h3 className="text-3xl font-black text-black mb-2 uppercase tracking-tight">{selectedCourse.name}</h3>
            <p className="text-[#9b1c1c] font-black tracking-widest text-sm mb-10">{selectedCourse.code} • INTERNAL ANALYSIS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={selectedCourse.internals}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {selectedCourse.internals?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-5">
                <h4 className="font-black text-black border-b-2 border-slate-100 pb-3 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Layers size={18} className="text-[#9b1c1c]" /> Component Breakdown
                </h4>
                {selectedCourse.internals?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></div>
                      <span className="font-black text-black uppercase tracking-tight text-xs">{item.name}</span>
                    </div>
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-500">
        <h3 className="text-xl font-black text-black mb-8 uppercase tracking-tight">Course Registration - Semester 6</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-black text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-6 py-5">Code</th>
                <th className="px-6 py-5">Course Name</th>
                <th className="px-6 py-5">Credits</th>
                <th className="px-6 py-5">Attendance</th>
                <th className="px-6 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-black">
              {MOCK_COURSES.map((course) => (
                <tr key={course.code} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 font-mono font-black text-sm text-[#9b1c1c]">{course.code}</td>
                  <td className="px-6 py-5 font-black uppercase tracking-tight text-sm">{course.name}</td>
                  <td className="px-6 py-5 font-black text-black">{course.credits}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                       <span className={`font-black text-sm ${course.attendance < 75 ? 'text-red-600' : 'text-green-700'}`}>{course.attendance}%</span>
                       <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${course.attendance < 75 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${course.attendance}%` }} />
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <button 
                      id={`btn:view-marks-${course.code}`}
                      onClick={() => { trackStep(`btn:view-marks-${course.code}`); setSelectedCourse(course); setAcademicView('internals'); }}
                      className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all relative ${
                        currentHighlight === `btn:view-marks-${course.code}`
                        ? 'bg-yellow-400 text-black ring-4 ring-yellow-400 ring-offset-2 animate-pulse scale-105 z-10 shadow-lg'
                        : 'bg-[#9b1c1c] text-white hover:bg-black hover:shadow-lg'
                      }`}
                    >
                      <Layers size={14} /> View Marks
                      {currentHighlight === `btn:view-marks-${course.code}` && (
                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-1 rounded-full shadow-lg">
                          <Sparkles size={12} />
                        </div>
                      )}
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
          <button onClick={() => setExamView('list')} className="flex items-center gap-2 text-black hover:text-[#9b1c1c] transition-colors font-black uppercase tracking-widest text-xs">
            <ArrowLeft size={18} /> Back to Timetable
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
            <div className="space-y-6">
              <div>
                <span className="bg-[#9b1c1c] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{selectedExam.code}</span>
                <h3 className="text-3xl font-black text-black mt-2 leading-tight uppercase tracking-tighter">{selectedExam.subject}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-1 flex items-center gap-1 tracking-widest"><Calendar size={12}/> Date</p>
                  <p className="font-black text-black">{selectedExam.date}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-1 flex items-center gap-1 tracking-widest"><Search size={12}/> Time</p>
                  <p className="font-black text-black">{selectedExam.time}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 col-span-2">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-1 flex items-center gap-1 tracking-widest"><MapPinned size={12}/> Examination Venue</p>
                  <p className="font-black text-[#9b1c1c] text-xl uppercase">{selectedExam.location}</p>
                </div>
              </div>
              <div className="p-5 bg-red-50 rounded-2xl border border-red-200">
                <p className="text-[10px] text-red-700 font-black uppercase mb-1 flex items-center gap-1 tracking-widest"><UserCheck size={12}/> Assigned Invigilator</p>
                <p className="font-black text-red-900 text-lg uppercase">{selectedExam.invigilator}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <h4 className="font-black text-black mb-6 flex items-center gap-2 border-b-2 border-slate-200 pb-3 uppercase tracking-widest text-sm"><BookOpen size={18} /> Syllabus Portions</h4>
              <ul className="space-y-4">
                {selectedExam.portions.map((portion, i) => (
                  <li key={i} className="flex items-start gap-4 text-black bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:translate-x-1 transition-transform">
                    <div className="w-2 h-2 rounded-full bg-[#9b1c1c] mt-2 shrink-0 shadow-sm" />
                    <span className="font-black text-sm uppercase tracking-tight">{portion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-xl font-black text-black mb-8 uppercase tracking-tight">End Semester Timetable</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MOCK_EXAMS.map((exam, i) => (
            <button 
              key={i} 
              id={`btn:view-exam-${exam.code}`}
              onClick={() => { trackStep(`btn:view-exam-${exam.code}`); setSelectedExam(exam); setExamView('details'); }}
              className={`p-6 rounded-3xl border-2 text-left hover:border-[#9b1c1c] hover:bg-red-50/50 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 relative ${
                currentHighlight === `btn:view-exam-${exam.code}`
                ? 'bg-yellow-400 border-yellow-400 ring-4 ring-yellow-400 ring-offset-2 animate-pulse scale-105 z-10 shadow-lg'
                : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded tracking-[0.2em] uppercase">{exam.code}</span>
              <h4 className="font-black text-black mt-4 mb-5 h-14 line-clamp-2 leading-tight uppercase tracking-tight group-hover:text-[#9b1c1c] transition-colors">{exam.subject}</h4>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest border-t border-slate-200 pt-4">{exam.date}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#9b1c1c] tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">Details</span>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-[#9b1c1c] transition-colors" />
              </div>
              {currentHighlight === `btn:view-exam-${exam.code}` && (
                <div className="absolute -top-3 -right-3 bg-yellow-500 text-white p-1 rounded-full shadow-lg z-20">
                  <Sparkles size={16} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderAnnouncements = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-black uppercase tracking-tight">University Announcements</h3>
        <div className="flex gap-2">
          {['All', 'Academic', 'Event', 'Administrative', 'Placement'].map(cat => (
            <button key={cat} className="px-4 py-2 text-[10px] font-black rounded-xl bg-slate-200 text-black hover:bg-[#9b1c1c] hover:text-white transition-all uppercase tracking-widest border-b-2 border-transparent hover:border-black">
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5">
        {MOCK_ANNOUNCEMENTS.map((item) => (
          <div 
            key={item.id} 
            id={`card:announcement-${item.id}`}
            onClick={() => trackStep(`card:announcement-${item.id}`)}
            className={`bg-white p-8 rounded-3xl shadow-sm border flex flex-col md:flex-row gap-8 hover:shadow-xl transition-all border-l-4 relative ${
              currentHighlight === `card:announcement-${item.id}`
              ? 'border-yellow-400 bg-yellow-50 ring-4 ring-yellow-400 ring-offset-2 animate-pulse scale-[1.02] z-10 shadow-2xl'
              : 'border-slate-100 border-l-transparent hover:border-l-[#9b1c1c]'
            }`}
          >
            <div className="shrink-0 flex flex-col items-center justify-center w-24 h-24 bg-slate-50 rounded-3xl border-2 border-slate-200 text-center shadow-inner">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
              <span className="text-4xl font-black text-black tracking-tighter">{new Date(item.date).getDate()}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${item.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {item.priority}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.category}</span>
              </div>
              <h4 className="text-xl font-black text-black mb-3 uppercase tracking-tight">{item.title}</h4>
              <p className="text-black leading-relaxed text-sm font-bold opacity-80">{item.content}</p>
            </div>
            <button className="self-center p-3 text-slate-200 hover:text-[#9b1c1c] transition-all hover:scale-110">
              <Info size={28} />
            </button>
            {currentHighlight === `card:announcement-${item.id}` && (
              <div className="absolute top-4 right-4 text-yellow-500">
                <Sparkles size={24} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-[#9b1c1c] via-[#801616] to-black flex items-end justify-end p-8">
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-white/20 transition-all border border-white/30 shadow-2xl"
          >
            {isEditingProfile ? <CheckCircle2 size={18} /> : <Edit2 size={18} />}
            {isEditingProfile ? "Finalize Changes" : "Modify Bio"}
          </button>
        </div>
        <div className="px-10 pb-10 -mt-24">
          <div className="relative inline-block group">
            <img src={userProfile.avatar} alt="Avatar" className="w-44 h-44 rounded-[40px] border-8 border-white shadow-2xl object-cover mb-8 bg-slate-100 transition-transform group-hover:scale-[1.02]" />
            {isEditingProfile && (
              <label className="absolute inset-0 bg-black/60 rounded-[40px] cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <div className="flex flex-col items-center gap-2">
                  <Camera className="text-white" size={36} />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">New Frame</span>
                </div>
                <input 
                  type="text" 
                  className="hidden" 
                  onChange={(e) => setUserProfile({...userProfile, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`})}
                />
              </label>
            )}
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-5xl font-black text-black tracking-tighter leading-none mb-2">{userProfile.name}</h3>
              <p className="text-[#9b1c1c] font-black text-2xl tracking-[0.3em] uppercase">{userProfile.rollNumber}</p>
            </div>
            <div className="flex gap-3">
              <span className="px-5 py-2.5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border border-white/10">{userProfile.department}</span>
              <span className="px-5 py-2.5 bg-slate-100 text-black rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-slate-200">Sem {userProfile.semester}</span>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-7 bg-slate-50 rounded-[32px] border-2 border-slate-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-3 flex items-center gap-2 tracking-[0.2em]"><Mail size={16} className="text-[#9b1c1c]" /> Official Email</p>
              {isEditingProfile ? (
                <input type="text" value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 font-black text-black focus:border-[#9b1c1c] outline-none transition-colors" />
              ) : (
                <p className="font-black text-black text-lg truncate">{userProfile.email}</p>
              )}
            </div>
            <div className="p-7 bg-slate-50 rounded-[32px] border-2 border-slate-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-3 flex items-center gap-2 tracking-[0.2em]"><Phone size={16} className="text-[#9b1c1c]" /> Personal Mobile</p>
              {isEditingProfile ? (
                <input type="text" value={userProfile.phone} onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 font-black text-black focus:border-[#9b1c1c] outline-none transition-colors" />
              ) : (
                <p className="font-black text-black text-lg">{userProfile.phone}</p>
              )}
            </div>
            <div className="p-7 bg-slate-50 rounded-[32px] border-2 border-slate-100 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-3 flex items-center gap-2 tracking-[0.2em]"><div className="w-4 h-4 bg-red-600 rounded-md shadow-sm"></div> Blood Factor</p>
              <p className="font-black text-black text-2xl">{userProfile.bloodGroup}</p>
            </div>
            <div className="p-7 bg-slate-50 rounded-[32px] border-2 border-slate-100 shadow-sm transition-all hover:shadow-md md:col-span-2 lg:col-span-3">
              <p className="text-[10px] text-slate-500 font-black uppercase mb-3 flex items-center gap-2 tracking-[0.2em]"><MapPin size={16} className="text-[#9b1c1c]" /> Permanent Address</p>
              {isEditingProfile ? (
                <textarea value={userProfile.address} onChange={(e) => setUserProfile({...userProfile, address: e.target.value})} className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 font-black text-black h-24 focus:border-[#9b1c1c] outline-none transition-colors" />
              ) : (
                <p className="font-black text-black leading-relaxed text-lg">{userProfile.address}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinance = () => {
    switch(financeView) {
      case 'mode_selection':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <button onClick={() => setFinanceView('summary')} className="flex items-center gap-2 text-black hover:text-[#9b1c1c] transition-colors font-black uppercase tracking-widest text-xs"><ArrowLeft size={18} /> Back to Summary</button>
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 max-w-3xl mx-auto">
              <h3 className="text-3xl font-black text-black mb-4 text-center uppercase tracking-tighter">Choose Your Channel</h3>
              <p className="text-slate-500 text-center font-bold mb-10">Instant clearance for all payment modes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { id: 'mode-upi', label: 'UPI INSTANT', icon: <Smartphone size={40} /> },
                  { id: 'mode-card', label: 'DEBIT / CREDIT', icon: <CreditCard size={40} /> },
                  { id: 'mode-netbanking', label: 'INTERNET BANKING', icon: <Building size={40} /> },
                  { id: 'mode-person', label: 'OFFLINE COUNTER', icon: <UserIcon size={40} /> },
                ].map((mode) => (
                  <button key={mode.id} id={`btn:${mode.id}`} onClick={() => { trackStep(`btn:${mode.id}`); setSelectedPaymentMode(mode.id); setFinanceView(mode.id === 'mode-person' ? 'success' : 'payment_details'); }} className={`p-10 rounded-[32px] border-4 transition-all flex flex-col items-center gap-6 group relative shadow-sm ${currentHighlight === `btn:${mode.id}` ? 'border-yellow-400 bg-yellow-50/50 ring-8 ring-yellow-400/20 scale-105 z-10 shadow-lg' : 'border-slate-50 hover:border-[#9b1c1c] hover:bg-slate-50 hover:shadow-2xl hover:-translate-y-1'}`}>
                    <div className="text-slate-300 group-hover:text-[#9b1c1c] transition-colors group-hover:scale-110 duration-300">{mode.icon}</div>
                    <span className="font-black text-black uppercase tracking-widest text-xs group-hover:text-[#9b1c1c]">{mode.label}</span>
                    {currentHighlight === `btn:${mode.id}` && (
                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-2 rounded-full shadow-2xl animate-bounce">
                        <Sparkles size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'payment_details':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <button onClick={() => setFinanceView('mode_selection')} className="flex items-center gap-2 text-black hover:text-[#9b1c1c] transition-colors font-black uppercase tracking-widest text-xs"><ArrowLeft size={18} /> Back to Channels</button>
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 max-w-md mx-auto text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-slate-100 text-[#9b1c1c] shadow-inner">
                {selectedPaymentMode === 'mode-card' ? <CreditCard size={32} /> : selectedPaymentMode === 'mode-netbanking' ? <Building size={32} /> : <Smartphone size={32} />}
              </div>
              <h3 className="text-2xl font-black text-black mb-8 uppercase tracking-tighter">Enter Details</h3>
              <div className="space-y-5">
                <input type="text" placeholder="ACCOUNT ID / VPA" className="w-full px-6 py-5 rounded-2xl border-4 border-slate-50 font-black text-black focus:border-[#9b1c1c] outline-none transition-all placeholder:text-slate-300 bg-slate-50/50" />
                <button onClick={() => setFinanceView('success')} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-[#9b1c1c] hover:shadow-[0_20px_40px_rgba(155,28,28,0.3)] transition-all active:scale-95">Complete ₹15,000 Payment</button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-8 tracking-widest">SSL SECURED END-TO-END</p>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] animate-in zoom-in-95 duration-700">
            <div className="relative">
              <div className="w-32 h-32 bg-green-100 text-green-700 rounded-[40px] flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(21,128,61,0.2)] animate-bounce">
                <CheckCircle2 size={64} />
              </div>
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-black p-3 rounded-2xl shadow-xl animate-pulse">
                <Sparkles size={24} />
              </div>
            </div>
            <h3 className="text-4xl font-black text-black uppercase tracking-tighter mb-4">Transfer Complete</h3>
            <p className="text-slate-500 font-bold text-lg mb-10">Receipt #AVV-CMS-{Math.floor(Math.random() * 999999)} generated.</p>
            <button onClick={() => setFinanceView('summary')} className="px-12 py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#9b1c1c] transition-all shadow-2xl active:scale-95 border-b-4 border-black active:border-b-0">Back to Hub</button>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 md:col-span-2">
              <h3 className="text-2xl font-black text-black mb-8 uppercase tracking-tight">Financial Ledger</h3>
              <div className="space-y-5">
                {MOCK_FEES.map((fee, i) => (
                  <div 
                    key={i} 
                    id={`item:fee-${i}`}
                    onClick={() => trackStep(`item:fee-${i}`)}
                    className={`flex items-center justify-between p-6 rounded-3xl border-4 transition-all group shadow-sm relative ${
                      currentHighlight === `item:fee-${i}`
                      ? 'border-yellow-400 bg-yellow-50 shadow-2xl scale-[1.02] z-10'
                      : 'border-slate-50 bg-slate-50/30 hover:bg-white hover:border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl shadow-inner transition-transform group-hover:scale-110 ${fee.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <p className="font-black text-black uppercase text-sm tracking-tight">{fee.title}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${fee.status === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>{fee.status}</p>
                      </div>
                    </div>
                    <p className="font-black text-black text-2xl tracking-tighter">₹{fee.amount.toLocaleString()}</p>
                    {currentHighlight === `item:fee-${i}` && (
                      <div className="absolute top-2 right-2 text-yellow-500">
                        <Sparkles size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1e293b] p-10 rounded-[48px] shadow-2xl text-white flex flex-col justify-between border-b-[12px] border-[#9b1c1c] overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-150 transition-transform duration-1000">
                 <Wallet size={200} />
              </div>
              <div className="relative z-10">
                <h4 className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Debt Exposure</h4>
                <p className="text-6xl font-black tracking-tighter leading-none mb-2">₹15,000</p>
                <div className="w-16 h-2 bg-[#9b1c1c] rounded-full" />
              </div>
              <button 
                id="btn:pay-outstanding"
                onClick={() => { trackStep('btn:pay-outstanding'); setFinanceView('mode_selection'); }} 
                className={`mt-12 w-full py-6 rounded-3xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-[0_25px_50px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden active:scale-95 ${
                  currentHighlight === 'btn:pay-outstanding' 
                  ? 'bg-yellow-400 text-black ring-8 ring-yellow-400/20 scale-105 shadow-2xl' 
                  : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                <Wallet size={24}/> Pay Debt
                {currentHighlight === 'btn:pay-outstanding' && (
                   <div className="absolute -top-2 -right-2 bg-yellow-500 text-white p-2 rounded-full shadow-2xl animate-bounce">
                      <Sparkles size={16} />
                   </div>
                )}
              </button>
            </div>
          </div>
        );
    }
  };

  const getActiveTabContent = () => {
    switch (activeTab) {
      case 'Dashboard': return renderDashboard();
      case 'Academics': return renderAcademics();
      case 'Finance': return renderFinance();
      case 'Exam Schedule': return renderExams();
      case 'Announcements': return renderAnnouncements();
      case 'Profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl lg:shadow-none`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-16 px-2">
            <div className="w-12 h-12 bg-[#9b1c1c] rounded-2xl flex items-center justify-center text-white shadow-[0_10px_30px_rgba(155,28,28,0.3)] hover:rotate-6 transition-transform">
              <GraduationCap size={28} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-black uppercase leading-tight">Amrita <br/><span className="text-[#9b1c1c]">CMS 2.0</span></h1>
          </div>
          <nav className="space-y-2 flex-1">
            <SidebarItem onClick={() => onTabClick('Dashboard')} icon={<LayoutDashboard size={22} />} label="Dashboard" active={activeTab === 'Dashboard'} highlight={currentHighlight === 'tab:Dashboard'} />
            <SidebarItem onClick={() => onTabClick('Academics')} icon={<BookOpen size={22} />} label="Academics" active={activeTab === 'Academics'} highlight={currentHighlight === 'tab:Academics'} />
            <SidebarItem onClick={() => onTabClick('Finance')} icon={<Wallet size={22} />} label="Finance" active={activeTab === 'Finance'} highlight={currentHighlight === 'tab:Finance'} />
            <SidebarItem onClick={() => onTabClick('Exam Schedule')} icon={<Calendar size={22} />} label="Exam Schedule" active={activeTab === 'Exam Schedule'} highlight={currentHighlight === 'tab:Exam Schedule'} />
            <SidebarItem onClick={() => onTabClick('Announcements')} icon={<Bell size={22} />} label="Announcements" active={activeTab === 'Announcements'} highlight={currentHighlight === 'tab:Announcements'} />
            <SidebarItem onClick={() => onTabClick('Profile')} icon={<UserIcon size={22} />} label="Profile" active={activeTab === 'Profile'} highlight={currentHighlight === 'tab:Profile'} />
          </nav>
          <div className="mt-auto pt-10 px-2 border-t border-slate-100">
             <button className="flex items-center gap-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-red-600 transition-colors">
                <LogOut size={18} /> Exit System
             </button>
          </div>
        </div>
      </aside>
      <main className={`flex-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'lg:ml-80' : 'ml-0'} p-6 lg:p-14 overflow-y-auto min-h-screen`} style={{ marginRight: chatOpen ? chatWidth : 0 }}>
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-14 gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-3 text-black hover:bg-slate-200 rounded-2xl transition-colors">
              {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
            <h2 className="text-5xl font-black text-black tracking-tighter uppercase">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-6 bg-white p-3 px-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all cursor-pointer group">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-black text-black leading-none uppercase tracking-tight group-hover:text-[#9b1c1c] transition-colors">{userProfile.name}</p>
               <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">{userProfile.rollNumber}</p>
             </div>
             <img src={userProfile.avatar} className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-slate-200 shadow-sm transition-transform group-hover:scale-110" alt="user" />
          </div>
        </header>
        {getActiveTabContent()}
      </main>
      <div className="fixed bottom-12 z-[60] transition-all duration-500" style={{ right: chatOpen ? chatWidth + 48 : 48 }}>
        {!chatOpen && (
          <button onClick={() => { setChatOpen(true); trackStep('agent:open-button'); }} className={`flex items-center gap-4 bg-[#9b1c1c] text-white px-10 py-5 rounded-[24px] shadow-[0_30px_60px_rgba(155,28,28,0.4)] hover:scale-110 active:scale-95 transition-all group relative ${guidePath.length > 0 || hasNotification ? 'animate-bounce ring-8 ring-red-500/10' : ''}`}>
            <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="font-black uppercase tracking-[0.2em] text-xs">Ask Advisor</span>
            {(hasNotification || isDeviated) && (
              <span className="absolute -top-2 -right-2 flex h-8 w-8">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-8 w-8 bg-red-600 border-4 border-white text-[10px] items-center justify-center font-black text-white">!</span>
              </span>
            )}
          </button>
        )}
      </div>
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 bg-white shadow-[0_0_120px_rgba(0,0,0,0.15)] z-[70] border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ width: chatWidth }}>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-[#9b1c1c]/40 group transition-colors" onMouseDown={startResizing}>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-white border-4 border-slate-200 p-2 rounded-xl shadow-2xl scale-125 transition-all">
               <GripVertical size={20} className="text-slate-400" />
            </div>
          </div>
          <div className="p-10 bg-[#9b1c1c] text-white flex items-center justify-between shrink-0 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
               <Sparkles size={80} />
            </div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-white/20 rounded-[20px] flex items-center justify-center backdrop-blur-md border border-white/20"><Sparkles className="animate-pulse" size={28} /></div>
              <div>
                <h3 className="font-black uppercase tracking-[0.2em] text-sm">System Oracle</h3>
                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Live Navigation Active</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all relative z-10"><X size={32} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/50">
            {chatMessages.length === 0 && (
              <div className="text-center mt-20 opacity-30 select-none">
                <Sparkles size={80} className="mx-auto mb-6 text-[#9b1c1c]" />
                <p className="font-black uppercase text-sm tracking-[0.3em]">Query the mainframe</p>
                <p className="text-xs font-bold mt-2 italic">"Show me Cyber Laws marks"</p>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4`}>
                <div className={`max-w-[90%] px-6 py-4 rounded-[28px] text-sm font-black shadow-lg leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-black text-white rounded-tr-none' 
                  : 'bg-white text-black rounded-tl-none border-4 border-slate-50'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && <div className="flex gap-2 p-5 bg-white rounded-3xl border-4 border-slate-50 w-20 animate-pulse"><div className="w-2 h-2 bg-[#9b1c1c] rounded-full"></div><div className="w-2 h-2 bg-[#9b1c1c] rounded-full"></div><div className="w-2 h-2 bg-[#9b1c1c] rounded-full"></div></div>}
          </div>
          <div className="p-8 border-t-2 border-slate-100 bg-white shrink-0">
            {isDeviated && guidePath.length > 0 && (
              <div className="mb-6 p-5 bg-orange-50 border-4 border-orange-200 rounded-[32px] text-xs flex items-center justify-between shadow-2xl animate-in zoom-in-95">
                <span className="font-black text-orange-900 uppercase tracking-tight">⚠️ Path Lost. Recalibrate?</span>
                <button onClick={() => setIsDeviated(false)} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">RESUME</button>
              </div>
            )}
            <div className="flex gap-4">
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Instruct the AI..." className="flex-1 bg-slate-100 border-4 border-transparent focus:border-[#9b1c1c]/20 rounded-[28px] px-8 py-5 text-sm font-black outline-none transition-all placeholder:text-slate-400" />
              <button onClick={handleSendMessage} className="bg-black text-white p-5 rounded-[28px] shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-[#9b1c1c] hover:scale-105 active:scale-95 transition-all"><ChevronRight size={32} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

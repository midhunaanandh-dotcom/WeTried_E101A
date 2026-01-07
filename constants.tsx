
import { Announcement, Course, User, Exam } from './types';

export const MOCK_USER: User & { email: string; phone: string; dob: string; bloodGroup: string; parentName: string; address: string } = {
  name: "Arjun K.",
  rollNumber: "CB.EN.U4CSE21001",
  department: "Computer Science and Engineering",
  semester: 6,
  cgpa: 8.92,
  attendance: 92,
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
  email: "arjun.k@cb.students.amrita.edu",
  phone: "+91 98765 43210",
  dob: "12-05-2003",
  bloodGroup: "O+",
  parentName: "Krishnan R.",
  address: "123, Lotus Apartment, Saravanampatti, Coimbatore - 641035"
};

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'End Semester Examination Schedule - May 2024',
    content: 'The finalized schedule for the End Semester Examinations for all UG and PG programs has been released. Students are advised to check their respective hall locations.',
    date: '2024-04-15',
    category: 'Academic',
    priority: 'High',
  },
  {
    id: '2',
    title: 'Guest Lecture on Generative AI',
    content: 'A specialized guest lecture on the impact of LLMs in software engineering is scheduled at Amriteswari Hall this Friday.',
    date: '2024-04-18',
    category: 'Event',
    priority: 'Normal',
  },
  {
    id: '3',
    title: 'Hostel Outing Permissions Update',
    content: 'New guidelines for weekend outing permissions have been posted on the administrative notice board.',
    date: '2024-04-20',
    category: 'Administrative',
    priority: 'Normal',
  },
];

export const MOCK_COURSES: Course[] = [
  { 
    code: '19CSE301', 
    name: 'Design and Analysis of Algorithms', 
    credits: 4, 
    grade: 'A+', 
    attendance: 95,
    internals: [
      { name: 'Continuous Assessments', value: 40 },
      { name: 'Assignments', value: 20 },
      { name: 'Projects', value: 30 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19CSE302', 
    name: 'Computer Networks', 
    credits: 4, 
    grade: 'A', 
    attendance: 88,
    internals: [
      { name: 'Continuous Assessments', value: 50 },
      { name: 'Assignments', value: 10 },
      { name: 'Projects', value: 30 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19CSE303', 
    name: 'Software Engineering', 
    credits: 3, 
    grade: 'B+', 
    attendance: 90,
    internals: [
      { name: 'Continuous Assessments', value: 30 },
      { name: 'Assignments', value: 20 },
      { name: 'Projects', value: 40 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19CSE304', 
    name: 'Compiler Design', 
    credits: 4, 
    grade: 'A', 
    attendance: 94,
    internals: [
      { name: 'Continuous Assessments', value: 45 },
      { name: 'Assignments', value: 15 },
      { name: 'Projects', value: 30 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19HUM101', 
    name: 'Professional Ethics', 
    credits: 2, 
    grade: 'O', 
    attendance: 100,
    internals: [
      { name: 'Continuous Assessments', value: 60 },
      { name: 'Assignments', value: 20 },
      { name: 'Projects', value: 10 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19MAT205', 
    name: 'Probability and Statistics', 
    credits: 4, 
    grade: 'B', 
    attendance: 72,
    internals: [
      { name: 'Continuous Assessments', value: 50 },
      { name: 'Assignments', value: 25 },
      { name: 'Projects', value: 20 },
      { name: 'Attendance', value: 5 },
    ]
  },
  { 
    code: '19CSE311', 
    name: 'Artificial Intelligence', 
    credits: 3, 
    grade: 'A', 
    attendance: 91,
    internals: [
      { name: 'Continuous Assessments', value: 35 },
      { name: 'Assignments', value: 15 },
      { name: 'Projects', value: 40 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19CSE331', 
    name: 'Cryptography', 
    credits: 3, 
    grade: 'A-', 
    attendance: 85,
    internals: [
      { name: 'Continuous Assessments', value: 40 },
      { name: 'Assignments', value: 20 },
      { name: 'Projects', value: 30 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19CSE305', 
    name: 'Machine Learning', 
    credits: 4, 
    grade: 'A+', 
    attendance: 98,
    internals: [
      { name: 'Continuous Assessments', value: 30 },
      { name: 'Assignments', value: 10 },
      { name: 'Projects', value: 50 },
      { name: 'Attendance', value: 10 },
    ]
  },
  { 
    code: '19LAW101', 
    name: 'Cyber Laws', 
    credits: 2, 
    grade: 'B+', 
    attendance: 78,
    internals: [
      { name: 'Continuous Assessments', value: 70 },
      { name: 'Assignments', value: 20 },
      { name: 'Projects', value: 5 },
      { name: 'Attendance', value: 5 },
    ]
  }
];

export const MOCK_FEES = [
  { title: 'Tuition Fee - Sem 6', amount: 125000, status: 'Paid', date: '2024-01-10' },
  { title: 'Hostel & Mess Fee', amount: 45000, status: 'Paid', date: '2024-01-12' },
  { title: 'Bus Fee', amount: 15000, status: 'Due', date: '-' },
];

export const MOCK_EXAMS: Exam[] = [
  { 
    date: '2024-05-15', 
    time: '09:30 AM', 
    code: '19CSE301', 
    subject: 'Design and Analysis of Algorithms',
    location: 'Main Block - Hall 204',
    portions: ['Dynamic Programming', 'Greedy Algorithms', 'Complexity Theory', 'Graph Traversal', 'NP-Completeness'],
    invigilator: 'Dr. Ramesh Kumar'
  },
  { 
    date: '2024-05-17', 
    time: '09:30 AM', 
    code: '19CSE302', 
    subject: 'Computer Networks',
    location: 'IT Block - Lab 3',
    portions: ['OSI Model', 'TCP/IP Protocol Suite', 'Congestion Control', 'Routing Algorithms', 'Network Security'],
    invigilator: 'Prof. Lakshmi Devi'
  },
  { 
    date: '2024-05-20', 
    time: '02:00 PM', 
    code: '19CSE303', 
    subject: 'Software Engineering',
    location: 'Amriteswari Hall',
    portions: ['Agile Methodologies', 'UML Diagrams', 'Software Testing', 'CI/CD Pipelines', 'Design Patterns'],
    invigilator: 'Dr. Suresh V.'
  },
  { 
    date: '2024-05-22', 
    time: '09:30 AM', 
    code: '19CSE304', 
    subject: 'Compiler Design',
    location: 'Main Block - Hall 101',
    portions: ['Lexical Analysis', 'Parsing Techniques', 'Code Generation', 'Symbol Tables', 'Optimization'],
    invigilator: 'Prof. Karthik S.'
  },
];

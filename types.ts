
export interface User {
  name: string;
  rollNumber: string;
  department: string;
  semester: number;
  cgpa: number;
  attendance: number;
  avatar: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'Academic' | 'Administrative' | 'Event' | 'Placement';
  priority: 'High' | 'Normal';
}

export interface InternalMarkSplit {
  name: string;
  value: number;
}

export interface Course {
  code: string;
  name: string;
  credits: number;
  grade: string;
  attendance: number;
  internals?: InternalMarkSplit[];
}

export interface Exam {
  date: string;
  time: string;
  code: string;
  subject: string;
  location: string;
  portions: string[];
  invigilator: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

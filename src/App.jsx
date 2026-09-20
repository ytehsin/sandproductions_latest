import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, updateDoc, deleteDoc, addDoc, setDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, CheckSquare, Target, Users, Briefcase, 
  Plus, X, AlertTriangle, Trash2, Download, FileText, Settings, 
  LogOut, Lock, Mail, Activity, DollarSign, Star, CheckCircle, 
  FileCheck, Send, UserCheck, Search, Menu, Shield, Printer,
  BookOpen, Clock, Target as TargetIcon, Calendar, Database, Upload
} from 'lucide-react';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqazKX9C7KU7zqUk2FEcFJdlREN62Q3Hk",
  authDomain: "zopeai-4299a.firebaseapp.com",
  projectId: "zopeai-4299a",
  storageBucket: "zopeai-4299a.firebasestorage.app",
  messagingSenderId: "308278160869",
  appId: "1:308278160869:web:1e9a2bb09a3ee36900530c",
  measurementId: "G-JWYBLHZZ7R"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-founder-os';

// --- CONSTANTS & ENUMS ---
const TASK_STATUSES = ['Backlog', 'Planned', 'In Progress', 'Waiting', 'Blocked', 'Completed'];
const TASK_CATEGORIES = ['Registration', 'Website', 'Tech', 'Branding', 'Sales', 'Marketing', 'Freelancers', 'Ops'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const PIPELINE_STAGES = ['Lead', 'Contacted', 'Meeting', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
const GOAL_STATUSES = ['On Track', 'At Risk', 'Delayed', 'Achieved'];
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SALES: 'sales',
  MARKETING: 'marketing',
  FREELANCER_MANAGER: 'freelancer_manager',
  FREELANCER: 'freelancer'
};

const SEED_DATA = {
  users: [
    { email: 'gagan@punproductions.com', password: 'password123', name: 'Gagan', role: ROLES.SUPER_ADMIN, status: 'Active' },
    { email: 'yasir@punproductions.com', password: 'password123', name: 'Yasir', role: ROLES.SUPER_ADMIN, status: 'Active' },
    { email: 'sales@punproductions.com', password: 'sales123', name: 'Alex (Sales)', role: ROLES.SALES, status: 'Active' },
    { email: 'marketing@punproductions.com', password: 'mktg123', name: 'Sam (Marketing)', role: ROLES.MARKETING, status: 'Active' },
    { email: 'crm@punproductions.com', password: 'crm123', name: 'Jordan (CRM)', role: ROLES.SALES, status: 'Active' }
  ],
  tasks: [
    { title: "Draft standard NDA & MSA", assignee: "Gagan", category: "Ops", priority: "High", status: "In Progress", dueDate: new Date(Date.now() + 86400000 * 1).toISOString() }
  ],
  clients: [
    { company: "TechFlow Inc.", contact: "Sarah Jenkins", email: "sarah@techflow.io", status: "Meeting", value: "15000", currency: "USD" }
  ],
  freelancers: [
    { name: "Lucy Ray", email: "lucy@freelance.com", sourceLang: "EN", targetLang: "UR", services: "Translation", rates: "0.06", currency: "USD", status: "Approved", rating: 4 }
  ],
  ndas: [
    { title: "Standard Mutual NDA", content: "This Non-Disclosure Agreement (the \"Agreement\") is entered into by and between [Your Company] and [Client Name]..." }
  ],
  campaigns: [
    { name: "Q4 EU Expansion", status: "Active", leadsGenerated: 45, budget: "500", currency: "USD", owner: "Sam (Marketing)" }
  ],
  goals: [
    { title: "Onboard 50 Premium Freelancers", status: "On Track", targetDate: new Date(Date.now() + 86400000 * 30).toISOString(), owner: "Gagan" }
  ],
  financials: [
    { type: 'Client Invoice', docNumber: 'INV-001', entity: 'TechFlow Inc.', amount: 2500, currency: 'USD', status: 'Sent', issueDate: new Date().toISOString() }
  ]
};

// --- UTILITIES ---
const formatCurrency = (amount, curr) => {
  const symbols = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£' };
  return `${symbols[curr] || ''}${Number(amount).toLocaleString()}`;
};

const getRelativeTimeString = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};

const downloadFile = (content, type, filename) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToCSV = (data, filename) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).filter(k => k !== 'id' && typeof data[0][k] !== 'object');
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(h => `"${String(row[h] != null ? row[h] : '').replace(/"/g, '""')}"`);
    csvRows.push(values.join(','));
  }
  downloadFile(csvRows.join('\n'), 'text/csv', `${filename}.csv`);
};

const exportToHTML = (data, filename) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).filter(k => k !== 'id' && typeof data[0][k] !== 'object');
  let html = `<table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif;"><thead><tr>`;
  headers.forEach(h => html += `<th style="padding: 8px; text-transform: capitalize;">${h}</th>`);
  html += `</tr></thead><tbody>`;
  data.forEach(row => {
    html += `<tr>`;
    headers.forEach(h => html += `<td style="padding: 8px;">${row[h] != null ? row[h] : ''}</td>`);
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  downloadFile(html, 'text/html', `${filename}.html`);
};

const downloadDocumentAsHTML = (docItem) => {
  const isPO = docItem.type.includes('PO');
  const title = isPO ? 'PURCHASE ORDER' : 'INVOICE';
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${docItem.docNumber} - ${title}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; background-color: #f8fafc; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 50px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 30px; }
            .title { color: #4f46e5; font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
            .meta { color: #64748b; font-size: 14px; margin-top: 8px; }
            .address-block { text-align: right; font-size: 14px; line-height: 1.6; color: #475569; }
            .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            .table th { background-color: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
            .table td { padding: 16px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
            .amount-total { font-size: 28px; font-weight: bold; color: #059669; margin-top: 30px; text-align: right; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; padding-top: 20px; border-top: 1px solid #f1f5f9; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div><h1 class="title">${title}</h1><p class="meta">Document #: <strong>${docItem.docNumber}</strong><br/>Date: ${new Date(docItem.createdAt).toLocaleDateString()}</p></div>
                <div class="address-block"><strong>Billed To / Assigned To:</strong><br/><span style="font-size: 18px; font-weight: 600; color: #0f172a;">${docItem.entityName}</span><br/>${docItem.entityEmail || ''}</div>
            </div>
            <table class="table"><thead><tr><th>Description of Services</th><th style="text-align: right;">Amount</th></tr></thead><tbody><tr><td>${docItem.description}</td><td style="text-align: right; font-weight: 500;">${docItem.currency} ${Number(docItem.amount).toLocaleString()}</td></tr></tbody></table>
            <div class="amount-total">Total Due: ${docItem.currency} ${Number(docItem.amount).toLocaleString()}</div>
            <div class="footer"><p>Generated securely via Founder OS Platform.</p></div>
        </div>
    </body>
    </html>
  `;
  downloadFile(htmlContent, 'text/html', `${docItem.docNumber}.html`);
};

const StarRating = ({ rating, onChange, readOnly = false }) => (
  <div className="flex space-x-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" disabled={readOnly} onClick={() => onChange && onChange(star)} className={`focus:outline-none ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}>
        <Star size={14} className={`${star <= (rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
      </button>
    ))}
  </div>
);

const ExportDropdown = ({ data, filename }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg shadow-sm transition-colors">
        <Download size={16} /><span>Export</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
          <button onClick={() => { exportToCSV(data, filename); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">CSV</button>
          <button onClick={() => { exportToHTML(data, filename); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">HTML</button>
        </div>
      )}
    </div>
  );
};

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center text-red-600 mb-4"><AlertTriangle size={24} className="mr-3" /><h2 className="text-lg font-bold text-slate-900">Confirm Deletion</h2></div>
        <p className="text-sm text-slate-600 mb-6">Are you sure you want to delete <span className="font-semibold text-slate-900">{itemName}</span>?</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  
  const [appUsers, setAppUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [ndas, setNdas] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [financials, setFinancials] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, collectionName: '' });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const logActivity = async (actionDesc) => {
    if (!appUser) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity'), {
        user: appUser.name, role: appUser.role, action: actionDesc, createdAt: new Date().toISOString()
      });
    } catch (err) { console.error("Logging failed", err); }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) { console.error(err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setFirebaseUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const baseRef = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
    
    const unsubUsers = onSnapshot(baseRef('users'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppUsers(data);
      if (data.length === 0 && loading) seedDatabase();
      else setLoading(false);
    });

    return () => unsubUsers();
  }, [firebaseUser]);

  useEffect(() => {
    if (!appUser) return;
    const baseRef = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
    const unsubs = [];

    if (appUser.role === ROLES.FREELANCER) {
      unsubs.push(onSnapshot(baseRef('financials'), snap => {
        const myFins = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.entityEmail?.toLowerCase() === appUser.email.toLowerCase());
        setFinancials(myFins);
      }));
    } else {
      unsubs.push(onSnapshot(baseRef('tasks'), snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(baseRef('clients'), snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(baseRef('freelancers'), snap => setFreelancers(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(baseRef('ndas'), snap => setNdas(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(baseRef('campaigns'), snap => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(baseRef('financials'), snap => setFinancials(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(baseRef('goals'), snap => setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
      unsubs.push(onSnapshot(baseRef('activity'), snap => setActivityLog(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)))));
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [appUser]);

  const seedDatabase = async () => {
    const baseRef = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
    try {
      for (const u of SEED_DATA.users) await addDoc(baseRef('users'), { ...u, createdAt: new Date().toISOString() });
      for (const t of SEED_DATA.tasks) await addDoc(baseRef('tasks'), { ...t, createdAt: new Date().toISOString() });
      for (const c of SEED_DATA.clients) await addDoc(baseRef('clients'), { ...c, createdAt: new Date().toISOString() });
      for (const f of SEED_DATA.freelancers) await addDoc(baseRef('freelancers'), { ...f, createdAt: new Date().toISOString() });
      for (const n of SEED_DATA.ndas) await addDoc(baseRef('ndas'), { ...n, createdAt: new Date().toISOString() });
      for (const c of SEED_DATA.campaigns) await addDoc(baseRef('campaigns'), { ...c, createdAt: new Date().toISOString() });
      for (const g of SEED_DATA.goals) await addDoc(baseRef('goals'), { ...g, createdAt: new Date().toISOString() });
      for (const f of SEED_DATA.financials) await addDoc(baseRef('financials'), { ...f, createdAt: new Date().toISOString() });
    } catch (e) { console.error(e); }
  };

  const executeDelete = async () => {
    if (!deleteModal.item || !deleteModal.collectionName) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', deleteModal.collectionName, deleteModal.item.id));
      logActivity(`Deleted a record from ${deleteModal.collectionName}`);
      showToast('Record deleted successfully.');
    } catch (err) { console.error(err); }
  };

  if (!appUser && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-10 text-center">
            <Activity size={48} className="text-white mx-auto mb-4 opacity-90" />
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Founder OS</h1>
            <p className="text-indigo-100 mt-2 text-sm">Sign in to your workspace</p>
          </div>
          <form className="p-8 space-y-5" onSubmit={(e) => {
            e.preventDefault();
            setLoginError('');
            const email = e.target.email.value.trim().toLowerCase();
            const password = e.target.password.value;
            const user = appUsers.find(u => u.email.toLowerCase() === email && u.password === password && u.status === 'Active');
            if (user) {
              setAppUser(user);
              if (user.role === ROLES.FREELANCER) setActiveView('freelancer-portal');
              else setActiveView('dashboard');
            } else {
              setLoginError("Invalid credentials or inactive account.");
            }
          }}>
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center border border-red-100">
                <AlertTriangle size={16} className="mr-2 flex-shrink-0" />{loginError}
              </div>
            )}
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label><div className="relative"><Mail className="absolute left-3 top-2.5 text-slate-400" size={18} /><input name="email" type="email" required className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" /></div></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label><div className="relative"><Lock className="absolute left-3 top-2.5 text-slate-400" size={18} /><input name="password" type="password" required className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" /></div></div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all mt-4">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  const hasAccess = (allowedRoles) => allowedRoles.includes('all') || allowedRoles.includes(appUser.role);

  const NavigationItem = ({ id, icon: Icon, label, allowedRoles }) => {
    if (!hasAccess(allowedRoles)) return null;
    return (
      <button onClick={() => { setActiveView(id); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${ activeView === id ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium' }`}>
        <Icon size={20} className={activeView === id ? 'text-indigo-600' : 'text-slate-400'} /><span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <ConfirmDeleteModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null, collectionName: '' })} onConfirm={executeDelete} itemName={deleteModal.item?.title || deleteModal.item?.company || deleteModal.item?.name || deleteModal.item?.email || deleteModal.item?.docNumber || "this item"} />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-[100] flex items-center animate-in slide-in-from-bottom-5">
          <CheckCircle size={20} className="text-emerald-400 mr-3" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-700"><Activity size={26} strokeWidth={2.5} /><span className="text-xl font-extrabold tracking-tight">Founder OS</span></div>
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
          {appUser.role !== ROLES.FREELANCER && (
            <>
              <NavigationItem id="dashboard" icon={LayoutDashboard} label="Dashboard" allowedRoles={['all']} />
              <NavigationItem id="tasks" icon={CheckSquare} label="Internal Tasks" allowedRoles={['all']} />
              <NavigationItem id="goals" icon={TargetIcon} label="Goals & Milestones" allowedRoles={['all']} />
              
              {(hasAccess([ROLES.SUPER_ADMIN, ROLES.SALES, ROLES.MARKETING])) && <div className="pt-5 pb-2"><p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth</p></div>}
              <NavigationItem id="crm" icon={Briefcase} label="Sales Pipeline" allowedRoles={[ROLES.SUPER_ADMIN, ROLES.SALES]} />
              <NavigationItem id="marketing" icon={Target} label="Marketing" allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MARKETING]} />
              
              {(hasAccess([ROLES.SUPER_ADMIN, ROLES.FREELANCER_MANAGER])) && <div className="pt-5 pb-2"><p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operations</p></div>}
              <NavigationItem id="freelancers" icon={Users} label="Freelancer DB" allowedRoles={[ROLES.SUPER_ADMIN, ROLES.FREELANCER_MANAGER]} />
              
              {(hasAccess([ROLES.SUPER_ADMIN])) && <div className="pt-5 pb-2"><p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finance & Legal</p></div>}
              <NavigationItem id="finance" icon={BookOpen} label="POs & Invoicing" allowedRoles={[ROLES.SUPER_ADMIN]} />
              <NavigationItem id="ndas" icon={FileText} label="Legal Templates" allowedRoles={[ROLES.SUPER_ADMIN]} />
              <NavigationItem id="activity" icon={Clock} label="Activity Log" allowedRoles={[ROLES.SUPER_ADMIN]} />

              <div className="pt-5 pb-2"><p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System</p></div>
              <NavigationItem id="settings" icon={Settings} label="Settings" allowedRoles={['all']} />
            </>
          )}

          {appUser.role === ROLES.FREELANCER && (
            <>
              <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">My Workspace</p></div>
              <NavigationItem id="freelancer-portal" icon={Briefcase} label="My Jobs & POs" allowedRoles={[ROLES.FREELANCER]} />
              <NavigationItem id="freelancer-invoices" icon={FileText} label="My Invoices" allowedRoles={[ROLES.FREELANCER]} />
              <NavigationItem id="settings" icon={Settings} label="Settings" allowedRoles={[ROLES.FREELANCER]} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase">{appUser.name.charAt(0)}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{appUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{appUser.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={() => setAppUser(null)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Logout"><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center flex-1">
            <button className="lg:hidden mr-4 text-slate-500" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <h1 className="text-lg font-bold text-slate-800 capitalize hidden md:block">{activeView.replace('-', ' ')}</h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {activeView === 'dashboard' && <DashboardView tasks={tasks} goals={goals} appUser={appUser} />}
          {activeView === 'tasks' && <TasksView tasks={tasks} appUser={appUser} appUsers={appUsers} setDeleteModal={setDeleteModal} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'goals' && <GoalsView goals={goals} appUser={appUser} setDeleteModal={setDeleteModal} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'crm' && <CRMView clients={clients} setDeleteModal={setDeleteModal} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'marketing' && <MarketingView campaigns={campaigns} setDeleteModal={setDeleteModal} appUser={appUser} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'freelancers' && <FreelancersView freelancers={freelancers} appUsers={appUsers} setDeleteModal={setDeleteModal} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'finance' && <FinanceView financials={financials} freelancers={freelancers} clients={clients} setDeleteModal={setDeleteModal} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'ndas' && <NDAView ndas={ndas} setDeleteModal={setDeleteModal} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'activity' && <ActivityLogView logs={activityLog} />}
          
          {activeView === 'freelancer-portal' && <FreelancerJobsView financials={financials} appUser={appUser} showToast={showToast} logActivity={logActivity} />}
          {activeView === 'freelancer-invoices' && <FreelancerInvoicesView financials={financials} appUser={appUser} />}

          {activeView === 'settings' && <SettingsView appUser={appUser} appUsers={appUsers} setDeleteModal={setDeleteModal} allData={{tasks, clients, freelancers, ndas, campaigns, financials, goals, activityLog, appUsers}} hasAccess={hasAccess} showToast={showToast} />}
        </div>
      </main>
    </div>
  );

  // --- SUB-COMPONENTS ---
  function DashboardView({ tasks, goals, appUser }) {
    const myTasks = tasks.filter(t => t.assignee === appUser.name && t.status !== 'Completed');
    const activeGoals = goals.filter(g => g.status !== 'Achieved');
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        <div className="flex justify-between items-end">
          <div><h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back, {appUser.name}</h1><p className="text-slate-500 mt-1 font-medium">Here is what is happening across the company today.</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 col-span-1 md:col-span-2">
            <h3 className="font-bold text-slate-900 mb-5 flex items-center text-lg"><CheckSquare className="mr-2 text-indigo-500" size={20} /> My Pending Tasks</h3>
            <div className="space-y-3">
              {myTasks.length === 0 ? <p className="text-slate-500 text-sm italic">All caught up! Great job.</p> : myTasks.map(task => (
                <div key={task.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center space-x-2"><p className="text-sm font-bold text-slate-800">{task.title}</p>{task.priority === 'High' && <span className="text-[9px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">High Priority</span>}</div>
                    <p className="text-xs text-slate-500 mt-1">{task.category} • Due: {getRelativeTimeString(task.dueDate) || 'No date set'}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">{task.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6 col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-5 text-lg">Company Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-sm font-medium text-slate-600">Total Active Tasks</span><span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{tasks.filter(t=>t.status!=='Completed').length}</span></div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3"><span className="text-sm font-medium text-slate-600">My Tasks</span><span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{myTasks.length}</span></div>
                <div className="flex justify-between items-center pb-1"><span className="text-sm font-medium text-slate-600">Blocked Tasks</span><span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{tasks.filter(t=>t.status==='Blocked').length}</span></div>
              </div>
            </div>
            <div className="bg-indigo-600 rounded-2xl shadow-sm p-6 text-white">
              <h3 className="font-bold mb-2 flex items-center"><TargetIcon className="mr-2" size={18} /> Active Goals</h3>
              {activeGoals.length === 0 ? <p className="text-sm text-indigo-100">No active goals.</p> : (
                <div className="space-y-3 mt-4">
                  {activeGoals.slice(0,2).map(g => (
                    <div key={g.id} className="bg-indigo-700 p-3 rounded-lg"><p className="font-semibold text-sm truncate">{g.title}</p><p className="text-xs text-indigo-200 mt-1">Status: {g.status}</p></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function TasksView({ tasks, appUser, appUsers, setDeleteModal, showToast, logActivity }) {
    const [showForm, setShowForm] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', assignee: appUser.name, category: 'Ops', priority: 'Medium', dueDate: '' });
    const internalUsers = appUsers.filter(u => u.role !== ROLES.FREELANCER);

    const handleAdd = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), { ...newTask, status: 'Backlog', assigner: appUser.name, createdAt: new Date().toISOString() });
      logActivity(`Assigned a new task: ${newTask.title}`);
      setNewTask({ title: '', assignee: appUser.name, category: 'Ops', priority: 'Medium', dueDate: '' });
      setShowForm(false);
      showToast("Task created.");
    };

    return (
      <div className="h-full flex flex-col max-w-6xl mx-auto space-y-4 animate-in fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Task Management</h2>
          <div className="flex space-x-3"><button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl"><Plus size={16} /><span>New Task</span></button><ExportDropdown data={tasks} filename="tasks_export" /></div>
        </div>
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Task Title</label><input required value={newTask.title} onChange={e=>setNewTask({...newTask, title: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"/></div>
            <div className="w-40"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Assignee</label><select value={newTask.assignee} onChange={e=>setNewTask({...newTask, assignee: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">{internalUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
            <div className="w-36"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Category</label><select value={newTask.category} onChange={e=>setNewTask({...newTask, category: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">{TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="w-32"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Priority</label><select value={newTask.priority} onChange={e=>setNewTask({...newTask, priority: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500">{TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="w-40"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Due Date</label><input type="date" value={newTask.dueDate} onChange={e=>setNewTask({...newTask, dueDate: e.target.value})} className="w-full border border-slate-200 p-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"/></div>
            <div className="flex space-x-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">Assign</button></div>
          </form>
        )}
        <div className="flex-1 overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Task Details</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Priority & Date</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Assignee</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map(task => {
                const canEdit = appUser.role === ROLES.SUPER_ADMIN || appUser.name === task.assignee || appUser.name === task.assigner;
                return (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="py-4 px-5"><p className="text-sm font-bold text-slate-900">{task.title}</p><p className="text-xs text-slate-500 mt-1 flex items-center">{task.category}</p></td>
                    <td className="py-4 px-5"><div className="flex flex-col items-start space-y-1.5"><span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${task.priority === 'Urgent' ? 'bg-red-100 text-red-700' : task.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{task.priority}</span><span className="text-xs text-slate-500 flex items-center"><Calendar size={12} className="mr-1"/> {getRelativeTimeString(task.dueDate) || 'No date'}</span></div></td>
                    <td className="py-4 px-5"><p className="text-sm font-semibold text-slate-800">{task.assignee}</p>{task.assigner && task.assigner !== task.assignee && <p className="text-[10px] text-slate-400 font-medium">By: {task.assigner}</p>}</td>
                    <td className="py-4 px-5"><select disabled={!canEdit} value={task.status} onChange={async (e) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: e.target.value }); logActivity(`Updated task status to ${e.target.value}`); }} className="text-xs font-bold border border-slate-200 rounded-lg p-1.5 bg-white outline-none cursor-pointer disabled:bg-slate-50">{TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td className="py-4 px-5 text-right">{canEdit ? <button onClick={() => setDeleteModal({ isOpen: true, item: task, collectionName: 'tasks' })} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16} /></button> : <span className="text-xs text-slate-300">Locked</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function GoalsView({ goals, appUser, setDeleteModal, showToast, logActivity }) {
    const [showForm, setShowForm] = useState(false);
    const [newGoal, setNewGoal] = useState({ title: '', status: 'On Track', targetDate: '', owner: appUser.name });
    const handleAdd = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'goals'), { ...newGoal, createdAt: new Date().toISOString() });
      logActivity(`Created a new company goal: ${newGoal.title}`);
      setNewGoal({ title: '', status: 'On Track', targetDate: '', owner: appUser.name });
      setShowForm(false);
      showToast("Goal created.");
    };
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
        <div className="flex justify-between items-center">
          <div><h2 className="text-2xl font-bold text-slate-900">Goals & Milestones</h2><p className="text-sm text-slate-500 mt-1">Track high-level company objectives.</p></div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl"><Plus size={16} /><span>Add Goal</span></button>
        </div>
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Goal Objective</label><input required value={newGoal.title} onChange={e=>setNewGoal({...newGoal, title: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50"/></div>
            <div className="w-40"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Target Date</label><input type="date" required value={newGoal.targetDate} onChange={e=>setNewGoal({...newGoal, targetDate: e.target.value})} className="w-full border border-slate-200 p-2 text-sm rounded-lg outline-none bg-slate-50"/></div>
            <div className="w-32"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Status</label><select value={newGoal.status} onChange={e=>setNewGoal({...newGoal, status: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none">{GOAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="flex space-x-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">Save</button></div>
          </form>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map(goal => (
            <div key={goal.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm group">
              <div className="flex justify-between items-start mb-4"><h3 className="font-bold text-slate-900 text-lg">{goal.title}</h3><select value={goal.status} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'goals', goal.id), { status: e.target.value })} className="text-[10px] uppercase font-bold px-2 py-1.5 rounded-lg outline-none bg-slate-50">{GOAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="flex items-center text-sm text-slate-500 mb-4 font-medium"><Calendar size={14} className="mr-2"/> Target: {new Date(goal.targetDate).toLocaleDateString()}</div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100"><span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded">Owner: {goal.owner}</span><button onClick={() => setDeleteModal({ isOpen: true, item: goal, collectionName: 'goals' })} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function CRMView({ clients, setDeleteModal, showToast, logActivity }) {
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [newClient, setNewClient] = useState({ company: '', contact: '', email: '', status: 'Lead', value: '', currency: 'USD' });
    const handleAdd = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...newClient, createdAt: new Date().toISOString() });
      logActivity(`Added new client lead: ${newClient.company}`);
      setNewClient({ company: '', contact: '', email: '', status: 'Lead', value: '', currency: 'USD' });
      setShowForm(false);
      showToast("Client added to pipeline.");
    };
    return (
      <div className="h-full flex flex-col max-w-6xl mx-auto space-y-4 animate-in fade-in">
        <div className="flex justify-between items-center">
          <div><h2 className="text-2xl font-bold text-slate-900">Sales Pipeline</h2><p className="text-sm text-slate-500 mt-0.5">Manage leads and clients</p></div>
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex bg-slate-200/50 p-1 rounded-xl">
              <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>List</button>
              <button onClick={() => setViewMode('grid')} className={`px-4 py-1.5 text-xs font-bold rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Grid</button>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl"><Plus size={16} /><span>Add Lead</span></button>
            <ExportDropdown data={clients} filename="clients_export" />
          </div>
        </div>
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Company</label><input required value={newClient.company} onChange={e=>setNewClient({...newClient, company: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50"/></div>
            <div className="flex-1 min-w-[120px]"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Contact Name</label><input required value={newClient.contact} onChange={e=>setNewClient({...newClient, contact: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50"/></div>
            <div className="w-48"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Value</label>
              <div className="flex border border-slate-200 rounded-lg bg-white shadow-sm">
                <select value={newClient.currency} onChange={e=>setNewClient({...newClient, currency: e.target.value})} className="bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-sm outline-none rounded-l-lg"><option value="INR">₹ INR</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="GBP">£ GBP</option></select>
                <input required value={newClient.value} onChange={e=>setNewClient({...newClient, value: e.target.value})} className="w-full p-2.5 text-sm outline-none rounded-r-lg" placeholder="5000" />
              </div>
            </div>
            <div className="w-40"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Stage</label><select value={newClient.status} onChange={e=>setNewClient({...newClient, status: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none">{PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="flex space-x-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">Save</button></div>
          </form>
        )}
        {viewMode === 'list' ? (
          <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Company</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Contact</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Stage</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Value</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 group">
                    <td className="py-4 px-5 text-sm font-bold text-slate-900">{client.company}</td>
                    <td className="py-4 px-5 text-sm font-medium text-slate-600">{client.contact}</td>
                    <td className="py-4 px-5"><select value={client.status} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id), { status: e.target.value })} className="text-xs font-bold border border-slate-200 rounded-lg p-1.5 bg-white outline-none cursor-pointer">{PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td className="py-4 px-5 text-sm font-bold text-emerald-700 bg-emerald-50 rounded inline-flex px-2 py-1 mt-3 ml-2">{formatCurrency(client.value, client.currency)}</td>
                    <td className="py-4 px-5 text-right"><button onClick={() => setDeleteModal({ isOpen: true, item: client, collectionName: 'clients' })} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 overflow-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-4">
            {clients.map(client => (
              <div key={client.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
                <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-slate-900 text-lg">{client.company}</h3><button onClick={() => setDeleteModal({ isOpen: true, item: client, collectionName: 'clients' })} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>
                <p className="text-sm font-medium text-slate-500 mb-6 flex items-center"><UserCheck size={14} className="mr-1.5 text-slate-400"/> {client.contact}</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100"><select value={client.status} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id), { status: e.target.value })} className="text-[11px] uppercase font-bold border border-slate-200 rounded-lg p-1.5 bg-slate-50">{PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select><span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">{formatCurrency(client.value, client.currency)}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function MarketingView({ campaigns, setDeleteModal, appUser, showToast, logActivity }) {
    const [showForm, setShowForm] = useState(false);
    const [newCamp, setNewCamp] = useState({ name: '', budget: '', currency: 'USD', status: 'Planned', leadsGenerated: 0, owner: appUser.name });
    const handleAdd = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), { ...newCamp, createdAt: new Date().toISOString() });
      logActivity(`Launched new marketing campaign: ${newCamp.name}`);
      setNewCamp({ name: '', budget: '', currency: 'USD', status: 'Planned', leadsGenerated: 0, owner: appUser.name });
      setShowForm(false);
      showToast("Campaign added.");
    };
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
        <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-900">Marketing Campaigns</h2><div className="flex space-x-3"><button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl"><Plus size={16} /><span>Add Campaign</span></button><ExportDropdown data={campaigns} filename="campaigns_export" /></div></div>
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Campaign Name</label><input required value={newCamp.name} onChange={e=>setNewCamp({...newCamp, name: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50"/></div>
            <div className="w-48"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Budget</label><div className="flex border border-slate-200 rounded-lg bg-white shadow-sm"><select value={newCamp.currency} onChange={e=>setNewCamp({...newCamp, currency: e.target.value})} className="bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-sm outline-none rounded-l-lg"><option value="INR">₹ INR</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="GBP">£ GBP</option></select><input required value={newCamp.budget} onChange={e=>setNewCamp({...newCamp, budget: e.target.value})} className="w-full p-2.5 text-sm outline-none rounded-r-lg" placeholder="1000" /></div></div>
            <div className="w-36"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Status</label><select value={newCamp.status} onChange={e=>setNewCamp({...newCamp, status: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none"><option value="Planned">Planned</option><option value="Active">Active</option><option value="Completed">Completed</option></select></div>
            <div className="flex space-x-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">Save</button></div>
          </form>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {campaigns.map(camp => (
            <div key={camp.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm group">
              <div className="flex justify-between items-start mb-6"><h3 className="font-bold text-slate-900 text-lg">{camp.name}</h3><select value={camp.status} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'campaigns', camp.id), { status: e.target.value })} className="text-[10px] uppercase font-bold px-2 py-1.5 rounded-lg outline-none bg-slate-50"><option value="Planned">Planned</option><option value="Active">Active</option><option value="Completed">Completed</option></select></div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100"><div><p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Leads Gen</p><p className="font-extrabold text-slate-900 text-lg">{camp.leadsGenerated}</p></div><div><p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Budget</p><p className="font-extrabold text-indigo-700 text-lg">{formatCurrency(camp.budget, camp.currency)}</p></div></div>
              <div className="flex justify-between items-center pt-2"><span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded">Owner: {camp.owner}</span><button onClick={() => setDeleteModal({ isOpen: true, item: camp, collectionName: 'campaigns' })} className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function FreelancersView({ freelancers, appUsers, setDeleteModal, showToast, logActivity }) {
    const [showForm, setShowForm] = useState(false);
    const [newFree, setNewFree] = useState({ name: '', email: '', sourceLang: '', targetLang: '', services: '', rates: '', currency: 'USD', status: 'Pending', rating: 0 });
    const handleAdd = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'freelancers'), { ...newFree, createdAt: new Date().toISOString() });
      logActivity(`Added new freelancer to database: ${newFree.name}`);
      setNewFree({ name: '', email: '', sourceLang: '', targetLang: '', services: '', rates: '', currency: 'USD', status: 'Pending', rating: 0 });
      setShowForm(false);
      showToast("Freelancer added.");
    };
    const createLoginAccount = async (freelancer) => {
      if (!freelancer.email) { showToast("Error: Email required."); return; }
      const exists = appUsers.find(u => u.email.toLowerCase() === freelancer.email.toLowerCase());
      if (exists) { showToast("Account already exists."); return; }
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { name: freelancer.name, email: freelancer.email, password: 'password123', role: ROLES.FREELANCER, status: 'Active', createdAt: new Date().toISOString() });
      logActivity(`Created portal login for freelancer: ${freelancer.name}`);
      showToast(`Login created! Password: password123`);
    };
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
        <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-900">Freelancer Database</h2><p className="text-sm text-slate-500 font-medium mt-0.5">Manage linguists and portal access.</p></div><div className="flex space-x-3"><button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl"><Plus size={16} /><span>Add Freelancer</span></button><ExportDropdown data={freelancers} filename="freelancers_export" /></div></div>
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Name</label><input required value={newFree.name} onChange={e=>setNewFree({...newFree, name: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50"/></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Email</label><input required type="email" value={newFree.email} onChange={e=>setNewFree({...newFree, email: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50"/></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Source Lang</label><input required value={newFree.sourceLang} onChange={e=>setNewFree({...newFree, sourceLang: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50" placeholder="EN"/></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Target Lang</label><input required value={newFree.targetLang} onChange={e=>setNewFree({...newFree, targetLang: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50" placeholder="ES"/></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Services Offered</label><input required value={newFree.services} onChange={e=>setNewFree({...newFree, services: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50" placeholder="Translation, VO"/></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Base Rate</label><div className="flex border border-slate-200 rounded-lg bg-white"><select value={newFree.currency} onChange={e=>setNewFree({...newFree, currency: e.target.value})} className="bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-sm outline-none rounded-l-lg"><option value="INR">₹ INR</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="GBP">£ GBP</option></select><input required value={newFree.rates} onChange={e=>setNewFree({...newFree, rates: e.target.value})} className="w-full p-2.5 text-sm outline-none rounded-r-lg" placeholder="0.08" /></div></div>
            <div className="flex items-end justify-end space-x-2 md:col-span-4 mt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm">Save Profile</button></div>
          </form>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Name & Contact</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Skills & Rate</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Quality</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Portal Access</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {freelancers.map(f => {
                const hasAccount = appUsers.some(u => u.email.toLowerCase() === f.email?.toLowerCase());
                return (
                  <tr key={f.id} className="hover:bg-slate-50 group">
                    <td className="py-4 px-5"><p className="text-sm font-bold text-slate-900">{f.name}</p><p className="text-xs text-slate-500 font-medium mt-0.5">{f.email}</p></td>
                    <td className="py-4 px-5"><p className="text-sm font-bold text-slate-800">{f.sourceLang} &rarr; {f.targetLang}</p><p className="text-xs text-slate-500 font-medium mt-0.5">{f.services} • <span className="font-bold text-emerald-700">{formatCurrency(f.rates, f.currency)}</span></p></td>
                    <td className="py-4 px-5"><StarRating rating={f.rating} onChange={(newRating) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'freelancers', f.id), { rating: newRating })} /></td>
                    <td className="py-4 px-5"><select value={f.status} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'freelancers', f.id), { status: e.target.value })} className="text-xs font-bold border border-slate-200 rounded-lg p-1.5 bg-white outline-none"><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select></td>
                    <td className="py-4 px-5">{hasAccount ? <span className="inline-flex items-center text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md"><CheckCircle size={12} className="mr-1"/> Active</span> : <button onClick={() => createLoginAccount(f)} className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">Create Login</button>}</td>
                    <td className="py-4 px-5 text-right"><button onClick={() => setDeleteModal({ isOpen: true, item: f, collectionName: 'freelancers' })} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function FinanceView({ financials, freelancers, clients, setDeleteModal, showToast, logActivity }) {
    const [activeTab, setActiveTab] = useState('payables'); 
    const [showForm, setShowForm] = useState(false);
    const [newDoc, setNewDoc] = useState({ type: 'PO', entityEmail: '', entityName: '', amount: '', currency: 'USD', description: '', status: 'Issued' });
    const isPayable = activeTab === 'payables';

    const handleAdd = async (e) => {
      e.preventDefault();
      const docNumber = isPayable ? `PO-${Math.floor(Math.random()*10000)}` : `INV-${Math.floor(Math.random()*10000)}`;
      const finalDoc = { ...newDoc, docNumber, createdAt: new Date().toISOString(), type: isPayable ? 'Freelancer PO' : 'Client Invoice' };
      if (isPayable) {
        const free = freelancers.find(f => f.email === newDoc.entityEmail);
        if (free) finalDoc.entityName = free.name;
      } else {
        finalDoc.status = 'Draft';
        finalDoc.entityName = newDoc.entityName; 
      }
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'financials'), finalDoc);
      logActivity(`Created ${finalDoc.type} for ${finalDoc.entityName} (${formatCurrency(finalDoc.amount, finalDoc.currency)})`);
      setShowForm(false);
      showToast(`${isPayable ? 'PO Sent' : 'Invoice Created'}.`);
    };

    const relevantDocs = financials.filter(f => isPayable ? f.type.includes('Freelancer') : f.type.includes('Client'));
    const renderTotals = (docs) => {
      const totals = docs.reduce((acc, doc) => {
        const curr = doc.currency || 'USD';
        acc[curr] = (acc[curr] || 0) + Number(doc.amount || 0);
        return acc;
      }, {});
      const keys = Object.keys(totals);
      if (keys.length === 0) return <span className="text-slate-400 font-medium">$0</span>;
      return keys.map(curr => <span key={curr} className="mr-3">{formatCurrency(totals[curr], curr)}</span>);
    };

    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
        <div className="flex justify-between items-end"><div><h2 className="text-2xl font-bold text-slate-900">POs & Invoicing</h2><p className="text-sm text-slate-500 mt-0.5">Manage financial documents and vendor assignments.</p></div><button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl"><Plus size={16} /><span>{isPayable ? 'Assign PO' : 'Create Invoice'}</span></button></div>
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          <button onClick={() => setActiveTab('payables')} className={`px-5 py-2.5 text-sm font-bold rounded-xl ${isPayable ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Accounts Payable (Vendors)</button>
          <button onClick={() => setActiveTab('receivables')} className={`px-5 py-2.5 text-sm font-bold rounded-xl ${!isPayable ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Accounts Receivable (Clients)</button>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-500 uppercase">Total Outstanding</p><div className="text-3xl font-extrabold text-red-600 mt-2 flex flex-wrap">{renderTotals(relevantDocs.filter(d => d.status !== 'Paid'))}</div></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-500 uppercase">Total Paid</p><div className="text-3xl font-extrabold text-emerald-600 mt-2 flex flex-wrap">{renderTotals(relevantDocs.filter(d => d.status === 'Paid'))}</div></div>
        </div>
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-5">
            {isPayable ? (
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Select Freelancer</label><select required value={newDoc.entityEmail} onChange={e=>setNewDoc({...newDoc, entityEmail: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none"><option value="" disabled>Select vendor...</option>{freelancers.map(f => <option key={f.id} value={f.email}>{f.name} ({f.email})</option>)}</select></div>
            ) : (
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Select Client</label><select required value={newDoc.entityName} onChange={e=>setNewDoc({...newDoc, entityName: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg bg-white outline-none"><option value="" disabled>Select client...</option>{clients.map(c => <option key={c.id} value={c.company}>{c.company}</option>)}</select></div>
            )}
            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Description</label><input required value={newDoc.description} onChange={e=>setNewDoc({...newDoc, description: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50" placeholder="e.g. Translation 5000 words"/></div>
            <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Amount</label><div className="flex border border-slate-200 rounded-lg bg-white shadow-sm"><select value={newDoc.currency} onChange={e=>setNewDoc({...newDoc, currency: e.target.value})} className="bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-sm outline-none rounded-l-lg"><option value="INR">₹ INR</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="GBP">£ GBP</option></select><input required type="number" value={newDoc.amount} onChange={e=>setNewDoc({...newDoc, amount: e.target.value})} className="w-full p-2.5 text-sm outline-none rounded-r-lg" placeholder="150" /></div></div>
            <div className="md:col-span-3 flex items-end justify-end space-x-2"><button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm">Save Document</button></div>
          </form>
        )}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Document</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{isPayable ? 'Vendor' : 'Client'}</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Description</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Amount</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th><th className="py-4 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {relevantDocs.map(docItem => (
                <tr key={docItem.id} className="hover:bg-slate-50">
                  <td className="py-4 px-5"><p className="text-sm font-bold text-slate-900">{docItem.docNumber}</p><p className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">{docItem.type}</p></td>
                  <td className="py-4 px-5 text-sm font-semibold text-slate-800">{docItem.entityName} <br/><span className="text-xs font-medium text-slate-500">{docItem.entityEmail}</span></td>
                  <td className="py-4 px-5 text-sm font-medium text-slate-600 max-w-[200px] truncate">{docItem.description}</td>
                  <td className="py-4 px-5 text-sm font-extrabold text-slate-900">{formatCurrency(docItem.amount, docItem.currency)}</td>
                  <td className="py-4 px-5"><select value={docItem.status} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financials', docItem.id), { status: e.target.value })} className={`text-xs font-bold border border-slate-200 rounded-lg p-1.5 outline-none ${docItem.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-700'}`}>{['Draft', 'Issued', 'Accepted', 'In Progress', 'Delivered', 'Invoiced', 'Paid', 'Sent', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="py-4 px-5 text-right flex justify-end space-x-1"><button onClick={() => downloadDocumentAsHTML(docItem)} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg"><Printer size={16}/></button><button onClick={() => setDeleteModal({ isOpen: true, item: docItem, collectionName: 'financials' })} className="text-slate-400 hover:text-red-600 p-2 rounded-lg"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function NDAView({ ndas, setDeleteModal, showToast, logActivity }) {
    const [activeNda, setActiveNda] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    const handleSave = async () => {
      if (!activeNda) return;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ndas', activeNda.id), { content: editContent });
      logActivity(`Edited legal template: ${activeNda.title}`);
      setActiveNda(null);
      showToast("Template saved.");
    };
    const handleAdd = async (e) => {
      e.preventDefault();
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'ndas'), { title: newTitle, content: 'Paste legal text here...', createdAt: new Date().toISOString() });
      logActivity(`Created new legal template: ${newTitle}`);
      setNewTitle('');
      setShowForm(false);
      showToast("Template added.");
    };
    const downloadText = (title, content) => downloadFile(content, 'text/plain', `${title.replace(/\s+/g, '_')}.txt`);

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-900">Legal Templates</h2><p className="text-sm font-medium text-slate-500 mt-0.5">Manage NDAs and SLAs.</p></div><button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 text-sm font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-xl"><Plus size={16} /><span>Add Template</span></button></div>
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex space-x-3">
            <input required value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Template Name" className="flex-1 border border-slate-200 p-2.5 text-sm rounded-lg outline-none bg-slate-50" />
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold">Create</button>
          </form>
        )}
        {activeNda ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"><h3 className="text-lg font-bold mb-4 text-slate-900">Editing: {activeNda.title}</h3><textarea className="w-full h-96 p-5 border border-slate-200 rounded-xl text-sm font-mono outline-none bg-slate-50/50" value={editContent} onChange={(e) => setEditContent(e.target.value)} /><div className="mt-5 flex justify-end space-x-3"><button onClick={() => setActiveNda(null)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Cancel</button><button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm">Save Template</button></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ndas.map(nda => (
              <div key={nda.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col group relative">
                <button onClick={() => setDeleteModal({ isOpen: true, item: nda, collectionName: 'ndas' })} className="absolute top-5 right-5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                <h3 className="font-bold text-slate-900 mb-3 text-lg pr-8">{nda.title}</h3>
                <p className="text-sm text-slate-500 mb-6 line-clamp-3 flex-1 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">{nda.content}</p>
                <div className="flex space-x-4 border-t border-slate-100 pt-4 mt-auto"><button onClick={() => { setActiveNda(nda); setEditContent(nda.content); }} className="text-indigo-600 text-sm font-bold">Edit Template</button><button onClick={() => downloadText(nda.title, nda.content)} className="text-slate-600 text-sm font-bold flex items-center"><Download size={14} className="mr-1.5"/> Download TXT</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function ActivityLogView({ logs }) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
        <h2 className="text-2xl font-bold text-slate-900">Company Activity Log</h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative">
          <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-slate-100 z-0"></div>
          <div className="space-y-6 relative z-10">
            {logs.length === 0 ? <p className="text-sm text-slate-500 pl-8">No recent activity.</p> : logs.slice(0,50).map(log => (
              <div key={log.id} className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div></div>
                <div className="ml-4 flex-1"><p className="text-sm font-medium text-slate-800"><span className="font-bold">{log.user}</span> {log.action}</p><p className="text-xs text-slate-400 font-medium mt-0.5">{new Date(log.createdAt).toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- FREELANCER PORTAL ---
  function FreelancerJobsView({ financials, appUser, showToast, logActivity }) {
    const myPOs = financials.filter(f => f.type === 'Freelancer PO' && f.entityEmail?.toLowerCase() === appUser.email.toLowerCase());
    const handleStatusChange = async (docId, newStatus) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financials', docId), { status: newStatus });
      logActivity(`${appUser.name} changed PO status to ${newStatus}`);
      if (newStatus === 'Accepted') showToast("Job accepted.");
      if (newStatus === 'Delivered') showToast("Work marked as delivered.");
    };
    const raiseInvoice = async (po) => {
      const docNumber = `INV-${Math.floor(Math.random()*10000)}`;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'financials'), { type: 'Freelancer Invoice', docNumber, entityEmail: po.entityEmail, entityName: po.entityName, amount: po.amount, currency: po.currency, description: `Invoice for PO: ${po.docNumber}`, status: 'Sent', createdAt: new Date().toISOString() });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financials', po.id), { status: 'Invoiced' });
      logActivity(`${appUser.name} submitted invoice ${docNumber}`);
      showToast("Invoice raised securely.");
    };
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
        <div><h2 className="text-3xl font-extrabold text-slate-900">My Assigned Jobs</h2><p className="text-sm text-slate-500 mt-1 font-medium">Review your Purchase Orders and submit invoices.</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {myPOs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center"><Briefcase size={48} className="text-slate-300 mb-4" /><p className="font-bold text-lg text-slate-700">No active jobs</p></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">PO Number</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Description</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Amount</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Status</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {myPOs.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900 text-sm">{po.docNumber}</td>
                    <td className="p-4 text-sm font-medium text-slate-600">{po.description}</td>
                    <td className="p-4 font-extrabold text-emerald-700 text-sm">{formatCurrency(po.amount, po.currency)}</td>
                    <td className="p-4"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${po.status === 'Issued' ? 'bg-amber-100 text-amber-700' : po.status === 'Invoiced' || po.status === 'Paid' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>{po.status}</span></td>
                    <td className="p-4 text-right">
                      {po.status === 'Issued' && <button onClick={() => handleStatusChange(po.id, 'Accepted')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700">Accept Job</button>}
                      {po.status === 'Accepted' && <button onClick={() => handleStatusChange(po.id, 'In Progress')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700">Start Work</button>}
                      {po.status === 'In Progress' && <button onClick={() => handleStatusChange(po.id, 'Delivered')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center ml-auto"><CheckCircle size={14} className="mr-1.5"/> Deliver</button>}
                      {po.status === 'Delivered' && <button onClick={() => raiseInvoice(po)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 flex items-center ml-auto"><FileText size={14} className="mr-1.5"/> Raise Invoice</button>}
                      {(po.status === 'Invoiced' || po.status === 'Paid') && <span className="text-xs font-bold text-slate-400">Invoice Raised</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  function FreelancerInvoicesView({ financials, appUser }) {
    const myInvoices = financials.filter(f => f.type === 'Freelancer Invoice' && f.entityEmail?.toLowerCase() === appUser.email.toLowerCase());
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
        <div><h2 className="text-3xl font-extrabold text-slate-900">My Invoices</h2><p className="text-sm text-slate-500 mt-1 font-medium">Track your submitted invoices.</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {myInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center"><FileText size={48} className="text-slate-300 mb-4" /><p className="font-bold text-lg text-slate-700">No invoices found</p></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Invoice #</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Description</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Amount</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Status</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase text-right">Download</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {myInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900 text-sm">{inv.docNumber}</td>
                    <td className="p-4 text-sm font-medium text-slate-600">{inv.description}</td>
                    <td className="p-4 font-extrabold text-emerald-700 text-sm">{formatCurrency(inv.amount, inv.currency)}</td>
                    <td className="p-4"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span></td>
                    <td className="p-4 text-right"><button onClick={() => downloadDocumentAsHTML(inv)} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg inline-flex"><Download size={16}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  function SettingsView({ appUser, appUsers, setDeleteModal, allData, hasAccess, showToast }) {
    const [activeTab, setActiveTab] = useState('profile');
    const isAdmin = appUser.role === ROLES.SUPER_ADMIN;
    
    const [myNewPassword, setMyNewPassword] = useState('');
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: ROLES.SALES });
    const [editingPwdUserId, setEditingPwdUserId] = useState(null);
    const [tempUserPwd, setTempUserPwd] = useState('');
    
    // Import/Export States
    const fileInputRef = useRef(null);
    const [importModalData, setImportModalData] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleUpdateMyPassword = async (e) => {
      e.preventDefault();
      if (myNewPassword.length < 6) { showToast("Error: Password too short."); return; }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', appUser.id), { password: myNewPassword });
      setMyNewPassword('');
      showToast('Password updated securely.');
    };

    const handleAddUser = async (e) => {
      e.preventDefault();
      if (!isAdmin) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { ...newUser, status: 'Active', createdAt: new Date().toISOString() });
      setNewUser({ name: '', email: '', password: '', role: ROLES.SALES });
      showToast("User created.");
    };

    const handleResetUserPwd = async (userId) => {
      if (tempUserPwd.length < 6) return;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { password: tempUserPwd });
      setEditingPwdUserId(null);
      setTempUserPwd('');
      showToast("Password reset successfully.");
    };

    // --- FULL DB EXPORT/IMPORT LOGIC ---
    const handleFullDatabaseExport = () => {
      const backupData = {
        users: allData.appUsers,
        tasks: allData.tasks,
        clients: allData.clients,
        freelancers: allData.freelancers,
        ndas: allData.ndas,
        campaigns: allData.campaigns,
        financials: allData.financials,
        goals: allData.goals,
        activity: allData.activityLog
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      downloadFile(jsonString, 'application/json', `founder_os_full_backup_${new Date().toISOString().split('T')[0]}.json`);
      showToast("Full database exported successfully.");
    };

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target.result);
          if (typeof parsedData !== 'object' || parsedData === null) throw new Error("Invalid JSON structure");
          setImportModalData(parsedData); // Open Warning Modal
        } catch (err) {
          console.error(err);
          showToast("Error reading backup file. Invalid format.");
        }
      };
      reader.readAsText(file);
      e.target.value = null; // Reset input
    };

    const executeFullImport = async () => {
      if (!importModalData) return;
      setIsImporting(true);
      try {
        const collections = Object.keys(importModalData);
        for (const colName of collections) {
          const items = importModalData[colName];
          if (Array.isArray(items)) {
            for (const item of items) {
              const { id, ...dataWithoutId } = item;
              if (id) {
                // Restore with exact same ID
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id), dataWithoutId);
              } else {
                // Fallback if ID is missing for some reason
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), dataWithoutId);
              }
            }
          }
        }
        showToast("Database restored successfully!");
      } catch (err) {
        console.error("Import failed: ", err);
        showToast("Failed to restore database. See console.");
      }
      setIsImporting(false);
      setImportModalData(null);
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
        
        {/* Import Warning Modal */}
        {importModalData && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 text-center mb-2">DANGER: DATABASE RESTORE</h2>
              <p className="text-sm text-slate-600 text-center mb-6">
                You are about to import a full JSON backup. This action will merge and potentially <strong>overwrite existing active database records</strong> matching the backup's IDs. 
                <br/><br/>
                Are you absolutely sure you want to proceed?
              </p>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={executeFullImport} 
                  disabled={isImporting}
                  className="w-full py-3.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-colors flex justify-center items-center"
                >
                  {isImporting ? <span className="animate-pulse">Restoring... Do not close window.</span> : 'Yes, Restore Database'}
                </button>
                <button 
                  onClick={() => setImportModalData(null)} 
                  disabled={isImporting}
                  className="w-full py-3.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition-colors"
                >
                  Cancel Import
                </button>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-3xl font-extrabold text-slate-900">Settings</h2>
        <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button onClick={() => setActiveTab('profile')} className={`px-5 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>My Profile</button>
          {isAdmin && <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>User Access</button>}
          {isAdmin && <button onClick={() => setActiveTab('export')} className={`px-5 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap ${activeTab === 'export' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Data & Backups</button>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-5">Personal Details</h3>
                <div className="grid grid-cols-2 gap-5 max-w-lg">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Name</label><input disabled value={appUser.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Role</label><input disabled value={appUser.role.replace('_', ' ').toUpperCase()} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-indigo-700"/></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Email</label><input disabled value={appUser.email} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700"/></div>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-100 max-w-lg">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Change Password</h3>
                <form onSubmit={handleUpdateMyPassword} className="flex space-x-3 items-center">
                  <input type="password" required minLength="6" value={myNewPassword} onChange={e=>setMyNewPassword(e.target.value)} className="flex-1 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold">Update</button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'users' && isAdmin && (
            <div className="space-y-8 animate-in fade-in">
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Name</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Role</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Status</th><th className="p-4 text-[11px] font-bold text-slate-500 uppercase">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm text-slate-900 font-bold">{u.name} <br/><span className="text-xs font-medium text-slate-500 mt-0.5 block">{u.email}</span></td>
                        <td className="p-4 text-sm">
                          <select value={u.role} onChange={(e) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), { role: e.target.value })} disabled={u.email === 'gagan@punproductions.com' || u.email === 'yasir@punproductions.com' || u.id === appUser.id} className="border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none disabled:bg-slate-50">
                            <option value={ROLES.SUPER_ADMIN}>Super Admin</option><option value={ROLES.SALES}>Sales</option><option value={ROLES.MARKETING}>Marketing</option><option value={ROLES.FREELANCER_MANAGER}>Freelancer Mgr</option><option value={ROLES.FREELANCER}>Freelancer</option>
                          </select>
                        </td>
                        <td className="p-4 text-sm"><span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{u.status}</span></td>
                        <td className="p-4">
                          <div className="flex flex-col space-y-2">
                            {editingPwdUserId === u.id ? (
                              <div className="flex space-x-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 w-fit">
                                <input type="password" value={tempUserPwd} onChange={e=>setTempUserPwd(e.target.value)} className="w-24 border border-slate-300 rounded-md px-2 py-1.5 text-xs outline-none" />
                                <button onClick={() => handleResetUserPwd(u.id)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-bold">Save</button>
                                <button onClick={() => {setEditingPwdUserId(null); setTempUserPwd('');}} className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex space-x-2 items-center">
                                <button onClick={() => setEditingPwdUserId(u.id)} className="text-slate-600 text-xs px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg font-bold transition-colors">Reset Pwd</button>
                                {!(u.email === 'gagan@punproductions.com' || u.email === 'yasir@punproductions.com' || u.id === appUser.id) && (
                                  <>
                                    <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), { status: u.status === 'Active' ? 'Suspended' : 'Active' })} className="text-indigo-700 text-xs font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">{u.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                                    <button onClick={() => setDeleteModal({ isOpen: true, item: u, collectionName: 'users' })} className="text-red-700 text-xs font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">Delete</button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-5 text-lg">Provision Staff Account</h4>
                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Name</label><input required value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} className="w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Email</label><input type="email" required value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} className="w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Password</label><input type="password" required minLength="6" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} className="w-full border border-slate-300 rounded-xl p-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"/></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Role</label>
                    <select value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})} className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white outline-none font-medium focus:ring-2 focus:ring-indigo-500">
                      <option value={ROLES.SALES}>Sales</option><option value={ROLES.MARKETING}>Marketing</option><option value={ROLES.FREELANCER_MANAGER}>Freelancer Manager</option><option value={ROLES.SUPER_ADMIN}>Super Admin</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex justify-end mt-2"><button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">Create User</button></div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'export' && isAdmin && (
            <div className="space-y-10 animate-in fade-in">
              {/* Full DB Backup/Restore Section */}
              <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-lg text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-700 pb-6 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center mb-2"><Database className="mr-3 text-indigo-400" size={28}/> Full System Backup</h3>
                    <p className="text-sm text-slate-400">Download or restore the entire Founder OS database securely as a JSON file.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-lg mb-2">Export Data</h4>
                    <p className="text-sm text-slate-400 mb-6">Create a single point-in-time JSON backup file containing all collections, users, and tasks.</p>
                    <button onClick={handleFullDatabaseExport} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center">
                      <Download size={18} className="mr-2" /> Export JSON Backup
                    </button>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-lg mb-2 text-red-400">Restore Data</h4>
                    <p className="text-sm text-slate-400 mb-6">Upload a previously exported JSON backup file to overwrite/merge existing data.</p>
                    <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center border border-slate-600">
                      <Upload size={18} className="mr-2" /> Restore from JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Individual Table Export Section */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Module Exports</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">Download individual CSV or HTML tables for reporting.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <div className="p-5 border border-slate-200 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-4"><div className="w-10 h-10 bg-white shadow-sm text-indigo-600 rounded-full flex items-center justify-center"><CheckSquare size={20}/></div><span className="font-bold text-sm text-slate-800">Tasks</span><ExportDropdown data={allData.tasks} filename="tasks_export" /></div>
                  <div className="p-5 border border-slate-200 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-4"><div className="w-10 h-10 bg-white shadow-sm text-indigo-600 rounded-full flex items-center justify-center"><Briefcase size={20}/></div><span className="font-bold text-sm text-slate-800">Clients</span><ExportDropdown data={allData.clients} filename="clients_export" /></div>
                  <div className="p-5 border border-slate-200 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-4"><div className="w-10 h-10 bg-white shadow-sm text-indigo-600 rounded-full flex items-center justify-center"><Users size={20}/></div><span className="font-bold text-sm text-slate-800">Freelancers</span><ExportDropdown data={allData.freelancers} filename="freelancers_export" /></div>
                  <div className="p-5 border border-slate-200 bg-slate-50 rounded-2xl flex flex-col items-center text-center space-y-4"><div className="w-10 h-10 bg-white shadow-sm text-indigo-600 rounded-full flex items-center justify-center"><BookOpen size={20}/></div><span className="font-bold text-sm text-slate-800">Financials</span><ExportDropdown data={allData.financials} filename="financials_export" /></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
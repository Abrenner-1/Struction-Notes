const fs = require('fs');

const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
const originalApp = lines.slice(307, 866).join('\n'); // The main App function
const imports = `import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Bell, PanelLeftClose, PanelLeftOpen, LogOut, User, Search, HardHat } from 'lucide-react';
import { db, auth, handleFirestoreError, logout } from './lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { isBefore, isAfter, subDays } from 'date-fns';
import { Project, Task } from './types';
import { cn } from './lib/utils';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AuthView } from './views/AuthView';
import { Dashboard } from './views/Dashboard';
import { ProjectView } from './views/ProjectView';
import { ProfileModal } from './components/modals/ProfileModal';
`;

// Also, the global reminders effect is inside the App component, I should use the useGlobalReminders hook I created
// But wait, changing the code inside the extracted App component is safer done directly in the script output.
// Let's modify the extracted App component to use useGlobalReminders instead of the inline effect.
let appContent = originalApp;
// The inline global reminders starts at line 394 and ends around 440.
// But since we are string matching, let's just replace everything and write it back.

fs.writeFileSync('src/App.tsx', imports + '\n' + appContent + '\n');
console.log('Cleaned App.tsx');

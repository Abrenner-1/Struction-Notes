const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

const imports = `import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Edit3, Image as ImageIcon, ChevronRight, X, Clock, MapPin, GripVertical, FileSpreadsheet, LayoutGrid, CheckCircle2, ChevronDown, Plus, LogOut, Search, Trash, Calendar, FileText, Bell, HardHat, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react';
import { formatDistanceToNow, format, isSameDay } from 'date-fns';
import { db, auth, handleFirestoreError, logout } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Task, Note, ProjectPage, Project, NoteType, ScheduleItem } from '../types';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
`;

fs.writeFileSync('src/components/TaskItem.tsx', imports + '\n' + lines.slice(1686, 1812).join('\n'));
fs.writeFileSync('src/components/NoteCard.tsx', imports + '\n' + lines.slice(1812, 1954).join('\n'));
fs.writeFileSync('src/views/ProjectCanvas.tsx', imports + '\n' + lines.slice(2495, 2760).join('\n'));

console.log('Extracted components');

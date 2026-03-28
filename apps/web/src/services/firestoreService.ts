import { db, auth, isFirebaseInitialized } from '../firebase';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    updateDoc,
    deleteDoc,
    where
} from 'firebase/firestore';

// Helper to prevent infinite hangs if offline or blocked
const withTimeout = <T>(promise: Promise<T>, ms: number = 15000): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firebase request timed out')), ms))
    ]);
};

// Types
export interface Program {
    id?: string;
    title: string;
    assemblyText: string;
    createdAt?: Timestamp | { seconds: number, nanoseconds: number };
    updatedAt?: Timestamp | { seconds: number, nanoseconds: number };
}

export interface Run {
    id?: string;
    programId: string;
    initialState: {
        registers: Record<string, number>;
        flags: Record<string, boolean>;
        pc: number;
        memory: Record<number, number>;
    };
    config: {
        pipelineMode: string;
        isaSubset: string;
        executionMode: string;
    };
    startedAt?: Timestamp | { seconds: number, nanoseconds: number };
}

export interface Snapshot {
    id?: string;
    runId?: string;
    stepIndex: number;
    pipeline: import('@playarm/core').PipelineState;
    registers: Record<string, number>;
    memory: Record<number, number>;
    flags: import('@playarm/core').Flags;
    timestamp?: Timestamp | { seconds: number, nanoseconds: number };
}

const PROGRAMS_COLLECTION = 'programs';

// Helper for Local Storage
const generateId = () => Math.random().toString(36).substr(2, 9);
const getStore = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setStore = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// PROGRAMS

export const saveProgram = async ({ title, assemblyText }: { title: string; assemblyText: string }): Promise<string> => {
    if (!isFirebaseInitialized || !db) {
        console.log("Saving program to Local Storage");
        const programs = getStore('programs');
        const newProgram = {
            id: generateId(),
            title,
            assemblyText,
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
            updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
        };
        programs.push(newProgram);
        setStore('programs', programs);
        return newProgram.id;
    }

    const userId = auth?.currentUser?.uid;

    try {
        const docRef = await withTimeout(addDoc(collection(db, PROGRAMS_COLLECTION), {
            title,
            assemblyText,
            userId: userId || null, // Attach the user making the request
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }));
        return docRef.id;
    } catch (error) {
        console.error("Error saving program:", error);
        throw error;
    }
};

export const listPrograms = async (): Promise<Program[]> => {
    if (!isFirebaseInitialized || !db) {
        return getStore('programs').sort((a: Program, b: Program) =>
            (b.updatedAt as any).seconds - (a.updatedAt as any).seconds
        );
    }

    const userId = auth?.currentUser?.uid;

    try {
        // Only fetch programs matching the current user, or all if no strict rules applied
        let q;
        if (userId) {
            q = query(collection(db, PROGRAMS_COLLECTION), where("userId", "==", userId), orderBy('updatedAt', 'desc'));
        } else {
            q = query(collection(db, PROGRAMS_COLLECTION), orderBy('updatedAt', 'desc'));
        }

        const querySnapshot = await withTimeout(getDocs(q));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Program));
    } catch (error: any) {
        console.error("Error listing programs:", error);
        
        // If the composite index is missing, fallback to fetching all and filtering locally, 
        // to prevent the app from breaking for the user
        if (error?.message?.includes("index")) {
            console.warn("Missing Firestore index! Falling back to client-side filtering.");
            const fallbackQ = query(collection(db, PROGRAMS_COLLECTION), orderBy('updatedAt', 'desc'));
            const snapshot = await withTimeout(getDocs(fallbackQ));
            return snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Program))
                .filter(p => (p as any).userId === userId);
        }
        
        throw error;
    }
};

export const getProgram = async (programId: string): Promise<Program | null> => {
    if (!isFirebaseInitialized || !db) {
        const programs = getStore('programs');
        return programs.find((p: Program) => p.id === programId) || null;
    }

    try {
        const docRef = doc(db, PROGRAMS_COLLECTION, programId);
        const docSnap = await withTimeout(getDoc(docRef));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Program;
        }
        return null;
    } catch (error) {
        console.error("Error getting program:", error);
        throw error;
    }
};

export const updateProgram = async (programId: string, { title, assemblyText }: { title?: string; assemblyText?: string }): Promise<void> => {
    if (!isFirebaseInitialized || !db) {
        const programs = getStore('programs');
        const index = programs.findIndex((p: Program) => p.id === programId);
        if (index !== -1) {
            programs[index] = {
                ...programs[index],
                ...(title && { title }),
                ...(assemblyText && { assemblyText }),
                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
            };
            setStore('programs', programs);
        }
        return;
    }

    try {
        const docRef = doc(db, PROGRAMS_COLLECTION, programId);
        await withTimeout(updateDoc(docRef, {
            ...(title && { title }),
            ...(assemblyText && { assemblyText }),
            updatedAt: serverTimestamp()
        }));
    } catch (error) {
        console.error("Error updating program:", error);
        throw error;
    }
};

export const deleteProgram = async (programId: string): Promise<void> => {
    if (!isFirebaseInitialized || !db) {
        const programs = getStore('programs');
        const filtered = programs.filter((p: Program) => p.id !== programId);
        setStore('programs', filtered);
        return;
    }

    try {
        await withTimeout(deleteDoc(doc(db, PROGRAMS_COLLECTION, programId)));
    } catch (error) {
        console.error("Error deleting program:", error);
        throw error;
    }
};

// RUNS (Subcollection of Program)

export const startRun = async (programId: string, { initialState, config }: { initialState: Run['initialState']; config: Run['config'] }): Promise<string> => {
    if (!isFirebaseInitialized || !db) {
        console.log("Starting run in Local Storage");
        const runs = getStore('runs');
        const newRun = {
            id: generateId(),
            programId,
            initialState,
            config,
            startedAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
        };
        runs.push(newRun);
        setStore('runs', runs);
        return newRun.id;
    }

    try {
        const runsCol = collection(db, PROGRAMS_COLLECTION, programId, 'runs');
        const docRef = await addDoc(runsCol, {
            initialState,
            config,
            startedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error starting run:", error);
        throw error;
    }
};

export const listRuns = async (programId: string): Promise<Run[]> => {
    if (!isFirebaseInitialized || !db) {
        const runs = getStore('runs');
        return runs.filter((r: Run) => r.programId === programId)
            .sort((a: Run, b: Run) => (b.startedAt as any).seconds - (a.startedAt as any).seconds);
    }

    try {
        const runsCol = collection(db, PROGRAMS_COLLECTION, programId, 'runs');
        const q = query(runsCol, orderBy('startedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            programId,
            ...doc.data()
        } as Run));
    } catch (error) {
        console.error("Error listing runs:", error);
        throw error;
    }
};

// SNAPSHOTS (Subcollection of Run)

export const addSnapshot = async (programId: string, runId: string, snapshot: Omit<Snapshot, 'id' | 'timestamp' | 'runId'>) => {
    if (!isFirebaseInitialized || !db) {
        console.log("Adding snapshot to Local Storage");
        const snapshots = getStore('snapshots');
        const newSnapshot = {
            id: generateId(),
            runId,
            ...snapshot,
            timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 }
        };
        snapshots.push(newSnapshot);
        setStore('snapshots', snapshots);
        return;
    }

    try {
        const snapshotsCol = collection(db, PROGRAMS_COLLECTION, programId, 'runs', runId, 'snapshots');
        await addDoc(snapshotsCol, {
            ...snapshot,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error adding snapshot:", error);
        throw error;
    }
};

export const getSnapshots = async (programId: string, runId: string): Promise<Snapshot[]> => {
    if (!isFirebaseInitialized || !db) {
        const snapshots = getStore('snapshots');
        return snapshots.filter((s: Snapshot) => s.runId === runId)
            .sort((a: Snapshot, b: Snapshot) => a.stepIndex - b.stepIndex);
    }

    try {
        const snapshotsCol = collection(db, PROGRAMS_COLLECTION, programId, 'runs', runId, 'snapshots');
        const q = query(snapshotsCol, orderBy('stepIndex', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            runId,
            ...doc.data()
        } as Snapshot));
    } catch (error) {
        console.error("Error getting snapshots:", error);
        throw error;
    }
};
